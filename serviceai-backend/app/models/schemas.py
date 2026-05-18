from pydantic import BaseModel
from typing import Any, Dict, List, Optional


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
    user_name: str
    location_address: str
    date: str
    time_slot: str
    price_agreed: int


class BookingConfirmation(BaseModel):
    booking_id: str
    provider_id: str
    provider_name: str
    service: str
    user_name: str
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
