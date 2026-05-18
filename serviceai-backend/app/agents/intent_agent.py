import json
import re
from app.models.schemas import ParsedIntent
from datetime import datetime, timedelta

DAY_MAP = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
VALID_CATEGORIES = [
    "plumber", "electrician", "doctor", "tutor", "ac_technician", "carpenter",
    "cleaner", "maid", "painter", "welder", "driver", "cook",
    "pest_control", "security_guard", "mechanic", "tailor",
]

# Map user-typed terms to canonical categories
CATEGORY_ALIASES = {
    "cleaning": "cleaner", "house cleaning": "cleaner", "deep clean": "cleaner",
    "sweep": "cleaner", "صفائی": "cleaner", "صفاي": "cleaner",
    "painting": "painter", "paint": "painter",
    "welding": "welder", "weld": "welder",
    "driving": "driver", "cab": "driver", "car": "driver",
    "cooking": "cook", "chef": "cook", "khana": "cook", "باورچی": "cook",
    "pest": "pest_control", "termite": "pest_control", "insects": "pest_control",
    "security": "security_guard", "guard": "security_guard",
    "mechanic": "mechanic", "car repair": "mechanic",
    "stitching": "tailor", "sewing": "tailor", "darzi": "tailor", "درزی": "tailor",
    "ac": "ac_technician", "air condition": "ac_technician",
    "electric": "electrician", "bijli": "electrician",
    "pipe": "plumber", "water": "plumber", "naala": "plumber",
    "wood": "carpenter", "furniture": "carpenter",
    "teach": "tutor", "teacher": "tutor", "padhai": "tutor",
    "doctor": "doctor", "hakeem": "doctor", "doc": "doctor",
}
KNOWN_AREAS = {
    "gulshan": ("Gulshan-e-Iqbal", "Karachi"),
    "gulshan-e-iqbal": ("Gulshan-e-Iqbal", "Karachi"),
    "dha karachi": ("DHA", "Karachi"),
    "dha lahore": ("DHA Lahore", "Lahore"),
    "dha": ("DHA", "Karachi"),
    "nazimabad": ("Nazimabad", "Karachi"),
    "clifton": ("Clifton", "Karachi"),
    "north karachi": ("North Karachi", "Karachi"),
    "gulberg": ("Gulberg", "Lahore"),
    "model town": ("Model Town", "Lahore"),
    "johar town": ("Johar Town", "Lahore"),
    "lahore": ("DHA Lahore", "Lahore"),
    "karachi": ("Gulshan-e-Iqbal", "Karachi"),
}


def _keyword_fallback(user_text: str, today: datetime, tomorrow: datetime) -> dict:
    text = user_text.lower()
    # Check exact category names first
    service = next((c for c in VALID_CATEGORIES if c in text or c.replace("_", " ") in text), None)
    # Then check aliases
    if not service:
        for alias, cat in CATEGORY_ALIASES.items():
            if alias in text:
                service = cat
                break
    if not service:
        service = "plumber"
    date = tomorrow.strftime("%Y-%m-%d") if any(w in text for w in ["kal", "tomorrow"]) else today.strftime("%Y-%m-%d")
    city, area = "Karachi", ""
    for key, (a, c) in KNOWN_AREAS.items():
        if key in text:
            area, city = a, c
            break
    budget_match = re.search(r"\b(\d{3,6})\b", text)
    budget = int(budget_match.group(1)) if budget_match else None
    urgency = "emergency" if any(w in text for w in ["emergency", "zaruri", "abhi", "urgent"]) else "scheduled"
    return {
        "service_category": service, "location": area or city,
        "city": city, "area": area, "date": date,
        "budget_max_pkr": budget, "urgency": urgency, "special_requirements": None,
    }


async def parse_intent(user_text: str) -> ParsedIntent:
    today = datetime.now()
    tomorrow = today + timedelta(days=1)

    # Fast keyword-based extraction — the agentic runner LLM handles high-level
    # understanding; this just needs to be fast and accurate for structured fields.
    data = _keyword_fallback(user_text, today, tomorrow)

    location_lower = (data.get("location") or "").lower()
    for key, (area, city) in KNOWN_AREAS.items():
        if key in location_lower:
            data["area"] = area
            data["city"] = city
            break

    cat = data.get("service_category", "")
    if cat not in VALID_CATEGORIES:
        data["service_category"] = CATEGORY_ALIASES.get(cat.lower(), cat if cat else "plumber")

    return ParsedIntent(
        service_category=data.get("service_category") or "plumber",
        location=data.get("location") or "",
        city=data.get("city") or "Karachi",
        area=data.get("area") or "",
        date=data.get("date") or today.strftime("%Y-%m-%d"),
        budget_max_pkr=data.get("budget_max_pkr"),
        urgency=data.get("urgency") or "scheduled",
        special_requirements=data.get("special_requirements"),
        raw_input=user_text,
    )
