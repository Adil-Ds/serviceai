"""
Tool Registration System — Groq / OpenAI-compatible function-calling format.
"""

from datetime import datetime

from app.agents.intent_agent import parse_intent as _parse_intent
from app.agents.search_agent import search_providers as _search_providers
from app.agents.ranking_agent import rank_providers as _rank_providers
from app.agents.web_search_agent import web_search_providers as _web_search_providers
from app.agents.realtime_scraper import scrape_realtime_providers as _scrape_realtime
from app.models.schemas import ParsedIntent


# ─── Tool Definitions (OpenAI-compatible) ────────────────────────────────────

REGISTERED_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "parse_intent",
            "description": (
                "Parse the user's raw service request text into structured intent. "
                "Handles Urdu, Roman Urdu, and English. Always call this first."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "The raw user query text, exactly as provided.",
                    }
                },
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_providers",
            "description": (
                "Search the service provider database using structured filters. "
                "Returns a found count and search summary. "
                "If found is 0 and an area was specified, call again without area for city-wide search."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "service_category": {
                        "type": "string",
                        "description": "One of: plumber, electrician, doctor, tutor, ac_technician, carpenter",
                    },
                    "city": {
                        "type": "string",
                        "description": "City: Karachi or Lahore",
                    },
                    "area": {
                        "type": "string",
                        "description": "Specific area within the city. Omit for city-wide search.",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format.",
                    },
                    "budget_max_pkr": {
                        "type": "integer",
                        "description": "Maximum budget in Pakistani Rupees.",
                    },
                },
                "required": ["service_category", "city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rank_providers",
            "description": (
                "Score and rank the providers found by the most recent search_providers call. "
                "Composite scoring: 35% proximity, 35% rating, 20% price, 10% reviews. "
                "Returns top 3 ranked results."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "user_area": {
                        "type": "string",
                        "description": "User's area name for distance calculation fallback.",
                    },
                    "budget_max_pkr": {
                        "type": "integer",
                        "description": "User's max budget for price scoring.",
                    },
                    "urgency": {
                        "type": "string",
                        "description": "Request urgency: emergency, scheduled, or flexible.",
                    },
                    "user_lat": {
                        "type": "number",
                        "description": "User's GPS latitude.",
                    },
                    "user_lng": {
                        "type": "number",
                        "description": "User's GPS longitude.",
                    },
                },
                "required": ["user_area"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_web_providers",
            "description": (
                "Search the internet for service providers when the local database returns zero results. "
                "Only call this after BOTH a specific-area search AND a city-wide search_providers returned found=0. "
                "Returns real business listings from the web with name, description, phone, and URL."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "service_category": {
                        "type": "string",
                        "description": "The service type to search for (e.g. cleaner, painter, mechanic).",
                    },
                    "area": {
                        "type": "string",
                        "description": "Specific area or neighbourhood. Leave empty for city-wide.",
                    },
                    "city": {
                        "type": "string",
                        "description": "City name: Karachi or Lahore.",
                    },
                },
                "required": ["service_category", "city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "scrape_realtime_providers",
            "description": (
                "Scrape the web in REAL-TIME to find live local service providers near the user's location. "
                "Uses DuckDuckGo Maps as primary source (returns business name, address, phone, GPS, rating, "
                "opening hours). Falls back to DuckDuckGo text search. "
                "Results are automatically saved to a JSON file for future agent access. "
                "Call this when you need accurate, up-to-date provider data beyond the local database. "
                "Returns: found count, saved file path, and full provider list."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "service_type": {
                        "type": "string",
                        "description": "The service to search for in plain English (e.g. 'plumber', 'math tutor', 'electrician', 'AC repair').",
                    },
                    "location": {
                        "type": "string",
                        "description": "Specific area or neighbourhood (e.g. 'Gulshan-e-Iqbal'). Leave empty for city-wide.",
                    },
                    "city": {
                        "type": "string",
                        "description": "City name (e.g. 'Karachi', 'Lahore', 'Islamabad').",
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of providers to return (default 10, max 20).",
                    },
                },
                "required": ["service_type", "city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ask_clarification",
            "description": (
                "Use only when service type is genuinely impossible to determine. "
                "Do not use if service can be inferred."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The clarification question to display to the user.",
                    },
                    "missing_field": {
                        "type": "string",
                        "description": "The field that is unclear: service_category, city, or area.",
                    },
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Suggested answer options.",
                    },
                },
                "required": ["question", "missing_field"],
            },
        },
    },
]

TOOL_DISPLAY_META: dict[str, tuple[str, str]] = {
    "parse_intent":              ("Intent Parser",    "language-outline"),
    "search_providers":          ("Provider Search",  "search-outline"),
    "rank_providers":            ("Ranking Engine",   "podium-outline"),
    "search_web_providers":      ("Web Search",       "globe-outline"),
    "scrape_realtime_providers": ("Live Scraper",     "wifi-outline"),
    "ask_clarification":         ("Clarification",    "help-circle-outline"),
}


# ─── Dispatcher ──────────────────────────────────────────────────────────────

async def dispatch_tool(fn_name: str, fn_args: dict, ctx) -> tuple[dict, str]:
    if fn_name == "parse_intent":
        return await _exec_parse_intent(fn_args, ctx)
    elif fn_name == "search_providers":
        return _exec_search_providers(fn_args, ctx)
    elif fn_name == "rank_providers":
        return await _exec_rank_providers(fn_args, ctx)
    elif fn_name == "search_web_providers":
        return await _exec_search_web_providers(fn_args, ctx)
    elif fn_name == "scrape_realtime_providers":
        return await _exec_scrape_realtime(fn_args, ctx)
    elif fn_name == "ask_clarification":
        return _exec_ask_clarification(fn_args, ctx)
    else:
        raise ValueError(f"Unknown tool: {fn_name!r}")


# ─── Executors ───────────────────────────────────────────────────────────────

async def _exec_parse_intent(fn_args: dict, ctx) -> tuple[dict, str]:
    intent: ParsedIntent = await _parse_intent(fn_args["text"])
    ctx.parsed_intent = intent.model_dump()

    result = {
        "service_category":     intent.service_category,
        "city":                 intent.city,
        "area":                 intent.area,
        "date":                 intent.date,
        "budget_max_pkr":       intent.budget_max_pkr,
        "urgency":              intent.urgency,
        "special_requirements": intent.special_requirements,
    }
    budget_str = f"Budget: ₨{intent.budget_max_pkr:,}" if intent.budget_max_pkr else "No budget specified"
    summary = (
        f"Detected: {intent.service_category} in "
        f"{intent.area or intent.city}, {intent.city}. "
        f"Date: {intent.date}. Urgency: {intent.urgency}. {budget_str}."
    )
    return result, summary


def _exec_search_providers(fn_args: dict, ctx) -> tuple[dict, str]:
    parsed = ctx.parsed_intent or {}
    today = datetime.now().strftime("%Y-%m-%d")

    intent = ParsedIntent(
        service_category=fn_args.get("service_category") or parsed.get("service_category", "plumber"),
        city=fn_args.get("city")           or parsed.get("city", "Karachi"),
        area=fn_args.get("area")           or "",
        date=fn_args.get("date")           or parsed.get("date", today),
        budget_max_pkr=fn_args.get("budget_max_pkr") or parsed.get("budget_max_pkr"),
        urgency=parsed.get("urgency", "scheduled"),
        special_requirements=parsed.get("special_requirements"),
        location=fn_args.get("area") or fn_args.get("city") or "",
        raw_input=ctx.user_text,
    )

    search_result = _search_providers(intent)
    ctx.search_result = search_result

    result = {
        "found": search_result.filtered_count,
        "search_summary": search_result.search_summary,
        "providers": [
            {
                "id":        p.id,
                "name":      p.name,
                "area":      p.area,
                "rating":    p.rating,
                "price_min": p.price_min,
                "verified":  p.verified,
            }
            for p in search_result.providers[:8]
        ],
    }
    summary = (
        f"Found {search_result.filtered_count} {intent.service_category}(s). "
        f"{search_result.search_summary}"
    )
    return result, summary


async def _exec_rank_providers(fn_args: dict, ctx) -> tuple[dict, str]:
    if not ctx.search_result or not ctx.search_result.providers:
        return (
            {"ranked": [], "error": "No providers in context. Call search_providers first."},
            "No providers available to rank.",
        )

    parsed = ctx.parsed_intent or {}
    today = datetime.now().strftime("%Y-%m-%d")

    intent = ParsedIntent(
        service_category=parsed.get("service_category", "plumber"),
        city=parsed.get("city", "Karachi"),
        area=fn_args.get("user_area") or parsed.get("area", ""),
        date=parsed.get("date", today),
        budget_max_pkr=fn_args.get("budget_max_pkr") or parsed.get("budget_max_pkr"),
        urgency=fn_args.get("urgency") or parsed.get("urgency", "scheduled"),
        special_requirements=parsed.get("special_requirements"),
        location=fn_args.get("user_area") or parsed.get("area", ""),
        raw_input=ctx.user_text,
    )

    eff_lat = fn_args.get("user_lat") or ctx.user_lat
    eff_lng = fn_args.get("user_lng") or ctx.user_lng

    ranked = await _rank_providers(ctx.search_result.providers, intent, eff_lat, eff_lng)
    ctx.ranked_providers = [r.model_dump() for r in ranked]

    result = {
        "ranked_count": len(ranked),
        "top_3": [
            {
                "rank":        r.rank,
                "name":        r.provider.name,
                "score":       r.score,
                "distance_km": r.distance_km,
                "reason":      r.reason,
                "area":        r.provider.area,
                "rating":      r.provider.rating,
                "price_min":   r.provider.price_min,
            }
            for r in ranked[:3]
        ],
    }

    if ranked:
        top = ranked[0]
        summary = (
            f"Ranked {len(ranked)} providers. "
            f"#1: {top.provider.name} — score {top.score}, "
            f"{top.distance_km} km away, rating {top.provider.rating}/5. "
            f"Reason: {top.reason}"
        )
    else:
        summary = "Ranking complete — no providers scored."

    return result, summary


async def _exec_search_web_providers(fn_args: dict, ctx) -> tuple[dict, str]:
    results = await _web_search_providers(
        fn_args.get("service_category", ""),
        fn_args.get("area", ""),
        fn_args.get("city", ""),
    )
    ctx.web_results = results
    if results:
        names = ", ".join(r["name"] for r in results[:3])
        summary = f"Found {len(results)} web results: {names}. Includes contact details where available."
    else:
        summary = "No web results found. The service may be unavailable in this area."
    return {"web_results": results, "count": len(results)}, summary


async def _exec_scrape_realtime(fn_args: dict, ctx) -> tuple[dict, str]:
    parsed = ctx.parsed_intent or {}
    service_type = fn_args.get("service_type") or parsed.get("service_category", "")
    location     = fn_args.get("location")     or parsed.get("area", "")
    city         = fn_args.get("city")         or parsed.get("city", "")
    max_results  = min(int(fn_args.get("max_results", 10)), 20)

    scrape_result = await _scrape_realtime(
        service_type=service_type,
        location=location,
        city=city,
        user_lat=ctx.user_lat,
        user_lng=ctx.user_lng,
        max_results=max_results,
    )

    # Store full results for the SSE complete event — NOT sent to Groq
    ctx.web_results = scrape_result.get("providers", [])

    found  = scrape_result["found"]
    source = scrape_result["source"]

    if found:
        names = ", ".join(p["name"] for p in ctx.web_results[:3])
        summary = (
            f"Live scrape found {found} {service_type}(s) near "
            f"{scrape_result.get('location_display') or scrape_result['location']} "
            f"via {source}. Top results: {names}."
        )
    else:
        summary = (
            f"Live scrape returned 0 results for {service_type!r} "
            f"near {scrape_result.get('location_display') or scrape_result['location']}."
        )

    # Return a TRIMMED dict to Groq — sending all 10 providers bloats the context
    groq_result = {
        "found":    found,
        "source":   source,
        "location": scrape_result.get("location_display") or scrape_result["location"],
        "top_results": [
            {
                "name":        p.get("name", ""),
                "address":     p.get("address", ""),
                "phone":       p.get("phone", ""),
                "distance_km": p.get("distance_km"),
            }
            for p in ctx.web_results[:5]
        ],
    }
    return groq_result, summary


def _exec_ask_clarification(fn_args: dict, ctx) -> tuple[dict, str]:
    clarification = {
        "type":          "clarification_needed",
        "question":      fn_args["question"],
        "missing_field": fn_args["missing_field"],
        "options":       fn_args.get("options", []),
    }
    ctx.clarification = clarification
    return clarification, f"Asking user: {fn_args['question']}"
