from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ServiceRequest, ParsedIntent, SearchResult,
    BookingRequest, BookingConfirmation, FollowUp, FollowUpSchedule,
    AgentRunResult,
)
from app.agents.intent_agent import parse_intent
from app.agents.search_agent import search_providers
from app.agents.ranking_agent import rank_providers
from app.agents.booking_agent import create_booking, fetch_booking
from app.agents.followup_agent import schedule_followups
from app.agents.agentic_runner import run_agentic_loop
from app.agents.realtime_scraper import scrape_realtime_providers, get_index, load_scraped_results
from app.database.db import (
    get_all_bookings, get_bookings_by_provider, update_booking_status,
    get_booked_slots, get_followups,
)
import json, os, traceback

router = APIRouter(prefix="/api")

PROVIDERS_PATH = os.path.join(os.path.dirname(__file__), "../../data/providers.json")


# ── Agent 1 ──────────────────────────────────────────────
@router.post("/parse-intent", response_model=ParsedIntent)
async def api_parse_intent(body: ServiceRequest):
    try:
        return await parse_intent(body.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Agent 2 ──────────────────────────────────────────────
@router.post("/search-providers", response_model=SearchResult)
async def api_search_providers(intent: ParsedIntent):
    try:
        return search_providers(intent)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Agent 3 ──────────────────────────────────────────────
@router.post("/rank-providers")
async def api_rank_providers(body: dict):
    try:
        intent = ParsedIntent(**body["intent"])
        from app.models.schemas import Provider
        providers = [Provider(**p) for p in body["providers"]]
        ranked = await rank_providers(providers, intent)
        return [r.model_dump() for r in ranked]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Agent 4 ──────────────────────────────────────────────
@router.post("/book", response_model=BookingConfirmation)
async def api_book(body: dict):
    try:
        request = BookingRequest(**body["booking"])
        phone = body.get("phone", "0300-0000000")
        return create_booking(request, phone)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Agent 5 ──────────────────────────────────────────────
@router.post("/schedule-followups", response_model=FollowUpSchedule)
async def api_schedule_followups(booking: BookingConfirmation):
    try:
        return await schedule_followups(booking)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Full Agentic Pipeline (Groq function-calling orchestration) ──────────────
@router.post("/analyze", response_model=AgentRunResult)
async def api_analyze(body: ServiceRequest):
    """
    Real Groq Antigravity orchestration.
    Groq (llama-3.3-70b-versatile) receives the user query + 5 registered tools
    and decides which tools to call, in what order, and when to fall back to web search.
    Returns the full tool_call_trace showing every real function call made.
    """
    try:
        result = await run_agentic_loop(body.text, user_lat=body.user_lat, user_lng=body.user_lng)
        return result
    except RuntimeError as e:
        if "QUOTA_EXCEEDED" in str(e):
            raise HTTPException(status_code=503, detail=str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Real-Time Scraper ─────────────────────────────────────

from pydantic import BaseModel as _BaseModel

class ScrapeRequest(_BaseModel):
    service_type: str
    location: str = ""
    city: str
    user_lat: float = None
    user_lng: float = None
    max_results: int = 10


@router.post("/scrape")
async def api_scrape_realtime(body: ScrapeRequest):
    """
    Scrape live service providers from the web using DuckDuckGo Maps.
    Returns real business data and saves results to data/scraped_results/.
    Designed for agentic AI consumption: each result file is self-contained JSON.
    """
    try:
        result = await scrape_realtime_providers(
            service_type=body.service_type,
            location=body.location,
            city=body.city,
            user_lat=body.user_lat,
            user_lng=body.user_lng,
            max_results=min(body.max_results, 20),
        )
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scrape/index")
async def api_scrape_index():
    """Return index of all past scraping sessions (for agentic AI lookup)."""
    return get_index()


@router.get("/scrape/file")
async def api_scrape_load(path: str):
    """Load a previously saved scraping result by file path."""
    if not path.endswith(".json"):
        raise HTTPException(status_code=400, detail="Path must be a .json file")
    data = await load_scraped_results(path)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data


# ── Data endpoints ────────────────────────────────────────
@router.get("/providers")
async def api_get_providers():
    with open(PROVIDERS_PATH, "r") as f:
        return json.load(f)["providers"]


@router.get("/bookings/{booking_id}", response_model=BookingConfirmation)
async def api_get_booking(booking_id: str):
    booking = fetch_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/bookings")
async def api_get_all_bookings():
    return get_all_bookings()


@router.put("/bookings/{booking_id}/status")
async def api_update_booking_status(booking_id: str, body: dict):
    """Provider accepts or declines a booking."""
    status = body.get("status")
    if status not in ("CONFIRMED", "CANCELLED"):
        raise HTTPException(status_code=400, detail="status must be CONFIRMED or CANCELLED")
    update_booking_status(booking_id, status)
    booking = fetch_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/provider/bookings/{provider_id}")
async def api_get_provider_bookings(provider_id: str, status: str = None):
    """Get bookings for a specific provider, optionally filtered by status."""
    return get_bookings_by_provider(provider_id, status)


@router.get("/booked-slots/{provider_id}/{date}")
async def api_get_booked_slots(provider_id: str, date: str):
    """Return list of time_slot strings already booked for this provider on this date."""
    return get_booked_slots(provider_id, date)


@router.get("/followups/{booking_id}", response_model=FollowUpSchedule)
async def api_get_followups(booking_id: str):
    """Retrieve persisted follow-up messages for a booking from SQLite."""
    rows = get_followups(booking_id)
    if not rows:
        raise HTTPException(status_code=404, detail="No follow-ups found for this booking")
    return FollowUpSchedule(
        booking_id=booking_id,
        followups=[FollowUp(**r) for r in rows],
    )
