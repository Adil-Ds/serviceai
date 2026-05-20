from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Union


class ServiceRequest(BaseModel):
    text: str
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None


class ParsedIntent(BaseModel):
    service_category: str
    location: str
    city: str
    area: str
    date: str
    budget_max_pkr: Optional[int] = None
    urgency: str = "scheduled"
    special_requirements: Optional[str] = None
    raw_input: str


class Provider(BaseModel):
    id: str
    name: str
    category: str
    city: str
    area: str
    lat: float
    lng: float
    rating: float
    review_count: int
    price_min: int
    price_max: int
    available_days: List[str]
    phone: str
    experience_years: int
    verified: bool


class RankedProvider(BaseModel):
    provider: Provider
    score: float
    distance_km: float
    score_breakdown: dict
    reason: str
    rank: int


class BookingRequest(BaseModel):
    provider_id: str
    provider_name: str
    service_category: str
    user_id: Optional[str] = "GUEST"
    user_name: str
    user_location: Optional[str] = ""
    location_address: str
    date: str
    time_slot: str
    price_agreed: int


class BookingConfirmation(BaseModel):
    booking_id: str
    provider_id: str
    provider_name: str
    service: str
    user_id: Optional[str] = "GUEST"
    user_name: str
    user_location: Optional[str] = ""
    location_address: str
    date: str
    time_slot: str
    price_agreed: int
    status: str
    phone: str
    created_at: str


class FollowUp(BaseModel):
    trigger: str
    trigger_label: str
    channel: str
    message: str


class FollowUpSchedule(BaseModel):
    booking_id: str
    followups: List[FollowUp]


class SearchResult(BaseModel):
    total_in_db: int
    filtered_count: int
    providers: List[Provider]
    search_summary: str


# ─── Business Finder (Agentic_booker pipeline) ───────────────────────────────

class FindBusinessRequest(BaseModel):
    service: str
    address: str
    max_results: int = 5
    max_reviews: int = 10
    headless: bool = False  # True breaks Google scraping on Windows; use only on Linux+Xvfb


class ScoredBusiness(BaseModel):
    rank: int
    name: Optional[str] = None
    rating: Optional[str] = None
    review_count: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    distance_km: Optional[float] = None
    rating_score: float = 0.0
    review_score: float = 0.0
    distance_score: float = 0.0
    total_score: float = 0.0


class FindBusinessResponse(BaseModel):
    service: str
    address: str
    businesses: List[ScoredBusiness]
    report: str
    report_file: str


# ─── Agentic Runner models (Phase A/B/C) ─────────────────────────────────────

class ToolCallStep(BaseModel):
    """One real tool call made by the AI during the orchestration loop."""
    step: int
    tool: str
    tool_display_name: str
    args: Dict[str, Any]
    result_summary: str
    status: str          # "success" | "error"
    duration_ms: int
    icon: str


class AgentRunResult(BaseModel):
    """Full result returned by the agentic runner to the API layer."""
    intent: Optional[Dict[str, Any]] = None
    ranked_providers: List[Dict[str, Any]]
    providers_found: int
    tool_call_trace: List[ToolCallStep]
    gemini_final_reasoning: str
    total_duration_ms: int
    iterations: int
    model: str = "llama-3.3-70b-versatile"
    clarification: Optional[Dict[str, Any]] = None
    web_results: Optional[List[Dict[str, Any]]] = None


# ─── Agentic Caller models ────────────────────────────────────────────────────

class InitiateCallRequest(BaseModel):
    provider_phone: str          # E.164 format, e.g. +923001234567
    provider_name: str
    user_name: str
    user_address: str
    problem: str
    service_type: str
    preferred_time: str
    language: str = "en"
    user_phone: Optional[str] = None   # stored for reference  ← added from Schema 2
    booking_id: Optional[str] = None
    user_id: Optional[str] = None


class ConfirmCallRequest(BaseModel):
    call_log_id: int        # returned by /initiate — all context is looked up from this
    user_decision: str      # "ACCEPT" | "COUNTER"
    user_proposed_time: Optional[str] = None  # only required when user_decision=COUNTER


class CallConclusion(BaseModel):
    call_log_id: int
    call_id: Optional[str] = None
    outcome: str                 # ACCEPTED | REJECTED | SUGGESTED_TIME | NO_ANSWER | USER_REJECTED
    suggested_time: Optional[str] = None
    reason: str = ""
    confidence: float = 0.0
    transcript: Optional[str] = None
    call_status: Optional[str] = None
    booking_id: Optional[str] = None