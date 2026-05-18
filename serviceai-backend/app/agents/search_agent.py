import json
import os
from datetime import datetime
from app.models.schemas import ParsedIntent, Provider, SearchResult

DATA_PATH = os.path.join(os.path.dirname(__file__), "../../data/providers.json")
DAY_MAP = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}


def load_providers() -> list[dict]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)["providers"]


def search_providers(intent: ParsedIntent) -> SearchResult:
    all_providers = load_providers()
    total_in_db = len(all_providers)

    # Filter 1: category
    by_category = [p for p in all_providers if p["category"] == intent.service_category]

    # Filter 2: location (city + area match)
    def location_match(p: dict) -> bool:
        if intent.city and p["city"].lower() != intent.city.lower():
            return False
        if intent.area:
            return intent.area.lower() in p["area"].lower() or p["area"].lower() in intent.area.lower()
        return True

    by_location = [p for p in by_category if location_match(p)]

    # Filter 3: availability on requested date
    try:
        date_obj = datetime.strptime(intent.date, "%Y-%m-%d")
        day_name = DAY_MAP[date_obj.weekday()]
        by_availability = [p for p in by_location if day_name in p["available_days"]]
    except Exception:
        by_availability = by_location

    # Filter 4: budget
    if intent.budget_max_pkr:
        by_budget = [p for p in by_availability if p["price_min"] <= intent.budget_max_pkr]
    else:
        by_budget = by_availability

    # Fallback: if nothing matches area, show all in city
    if not by_budget and by_category:
        by_budget = [p for p in by_category if p["city"].lower() == intent.city.lower()][:5]

    providers = [Provider(**p) for p in by_budget]

    summary = (
        f"Found {total_in_db} {intent.service_category}s in database. "
        f"After filtering: {len(by_category)} in category, "
        f"{len(by_location)} in {intent.area or intent.city}, "
        f"{len(by_availability)} available on requested date, "
        f"{len(providers)} within budget."
    )

    return SearchResult(
        total_in_db=total_in_db,
        filtered_count=len(providers),
        providers=providers,
        search_summary=summary,
    )
