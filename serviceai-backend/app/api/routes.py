import asyncio
import json
import os
import traceback

from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ServiceRequest, ParsedIntent, SearchResult,
    BookingRequest, BookingConfirmation, FollowUp, FollowUpSchedule,
    AgentRunResult,
    FindBusinessRequest, FindBusinessResponse, ScoredBusiness,
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


# ── Business Finder (Google scraper + geocoding + LLM report) ─────────────────

@router.post("/find-business", response_model=FindBusinessResponse)
async def api_find_business(body: FindBusinessRequest):
    """
    Full pipeline:
      1. LLM calls Google scraper tool → real business listings
      2. Geocode each address → haversine distance from user
      3. Score businesses (rating 0-40 + reviews 0-30 + distance 0-30)
      4. LLM writes a ranked plain-text report with Phone & Address columns

    This is a blocking browser scrape — may take 3-8 minutes.
    Returns the LLM report and scored business list as JSON.
    """
    try:
        from app.Agentic_booker.pipeline import run_pipeline

        import random
        max_res = body.max_results if body.max_results not in (1, 5) else random.randint(2, 5)
        print(f"[api_find_business] Scraping with dynamic max_results={max_res}")

        result = await asyncio.wait_for(
            asyncio.to_thread(
                run_pipeline,
                service=body.service,
                user_address=body.address,
                max_results=max_res,
                max_reviews=body.max_reviews,
                headless=body.headless,
            ),
            timeout=600,  # 10-minute hard cap
        )

        businesses = [
            ScoredBusiness(
                rank=i + 1,
                name=b.get("name"),
                rating=b.get("rating"),
                review_count=b.get("review_count"),
                address=b.get("address"),
                phone=b.get("phone"),
                website=b.get("website"),
                distance_km=b.get("distance_km"),
                rating_score=b.get("rating_score", 0.0),
                review_score=b.get("review_score", 0.0),
                distance_score=b.get("distance_score", 0.0),
                total_score=b.get("total_score", 0.0),
            )
            for i, b in enumerate(result.get("businesses", []))
        ]

        return FindBusinessResponse(
            service=result["service"],
            address=result["address"],
            businesses=businesses,
            report=result["report"],
            report_file=result.get("report_path", ""),
        )

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Pipeline timed out after 10 minutes. Try fewer results.",
        )
    except Exception as e:
        traceback.print_exc()
        try:
            print("[find-business] Pipeline failed. Attempting proactive fallback to cached JSON results...")
            slug = body.service.lower().strip()
            candidates = []
            for fname in os.listdir("."):
                if fname.startswith(slug) and fname.endswith("_data.json"):
                    candidates.append(fname)
            
            if candidates:
                candidates.sort()
                latest_cache = candidates[-1]
                print(f"[find-business] Found cached snapshot: {latest_cache}")
                with open(latest_cache, "r", encoding="utf-8") as f:
                    cache_data = json.load(f)
                
                from app.Agentic_booker.pipeline import geocode
                user_coords = geocode(body.address)
                user_lat = user_coords[0] if user_coords else None
                user_lng = user_coords[1] if user_coords else None
                
                businesses = []
                for i, b in enumerate(cache_data.get("businesses", []), 1):
                    scores = {
                        "rating_score": 0.0,
                        "review_score": 0.0,
                        "distance_km": None,
                        "distance_score": 0.0,
                        "total_score": 0.0,
                    }
                    if user_lat is not None:
                        from app.Agentic_booker.pipeline import score_business
                        scores = score_business(b, user_lat, user_lng)
                    
                    businesses.append(
                        ScoredBusiness(
                            rank=i,
                            name=b.get("name"),
                            rating=b.get("rating"),
                            review_count=b.get("review_count"),
                            address=b.get("address"),
                            phone=b.get("phone"),
                            website=b.get("website"),
                            distance_km=scores.get("distance_km"),
                            rating_score=scores.get("rating_score", 0.0),
                            review_score=scores.get("review_score", 0.0),
                            distance_score=scores.get("distance_score", 0.0),
                            total_score=scores.get("total_score", 0.0),
                        )
                    )
                
                businesses.sort(key=lambda x: x.total_score, reverse=True)
                for idx, b in enumerate(businesses):
                    b.rank = idx + 1
                
                report = f"## Business Analysis (Cached Fallback)\n\n"
                report += f"Proactive fallback activated due to temporary live search unavailability.\n\n"
                for b in businesses[:3]:
                    report += f"{b.rank}. **{b.name}**: Proximity is {b.distance_km} km with a total rating of {b.rating}.\n"
                
                return FindBusinessResponse(
                    service=body.service,
                    address=body.address,
                    businesses=businesses,
                    report=report,
                    report_file=latest_cache,
                )
        except Exception as ex:
            print(f"[find-business] Cache fallback failed: {ex}")
        raise HTTPException(status_code=500, detail=str(e))


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
async def api_get_all_bookings(user_id: str = None):
    if user_id:
        from app.database.db import get_bookings_by_user
        return get_bookings_by_user(user_id)
    return get_all_bookings()


@router.get("/analytics")
async def api_get_user_analytics(user_id: str = None):
    """Retrieve real-time database-driven analytics for a specific user."""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    from app.database.db import get_user_analytics
    return get_user_analytics(user_id)


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
