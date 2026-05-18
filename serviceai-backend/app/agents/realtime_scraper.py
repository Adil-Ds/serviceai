"""
Real-Time Web Scraper Tool
Multi-strategy approach for finding live local service providers.

Strategy priority:
  1. Nominatim geocode location -> Overpass API (OpenStreetMap real business data)
  2. DuckDuckGo Maps (if library supports it)
  3. DuckDuckGo text search (always available fallback)

Results saved to data/scraped_results/ with index.json for agentic AI access.
No API keys required.
"""

import asyncio
import json
import math
import os
import re
import time
from datetime import datetime
from typing import Dict, List, Optional

import httpx

RESULTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../data/scraped_results")
)
INDEX_FILE = os.path.join(RESULTS_DIR, "index.json")

# Map service keywords to OpenStreetMap tags
OSM_TAG_MAP: Dict[str, List[Dict[str, str]]] = {
    "plumber":        [{"craft": "plumber"}, {"shop": "plumbing"}],
    "electrician":    [{"craft": "electrician"}, {"shop": "electrical"}],
    "doctor":         [{"amenity": "doctors"}, {"amenity": "clinic"}, {"amenity": "hospital"}],
    "tutor":          [{"amenity": "college"}, {"amenity": "language_school"}, {"shop": "tutoring"}],
    "ac_technician":  [{"shop": "hvac"}, {"craft": "hvac_technician"}],
    "carpenter":      [{"craft": "carpenter"}, {"shop": "furniture"}],
    "mechanic":       [{"shop": "car_repair"}, {"craft": "mechanic"}],
    "painter":        [{"craft": "painter"}],
    "cleaner":        [{"shop": "cleaning"}],
    "gardener":       [{"craft": "gardener"}],
}

NOMINATIM_URL         = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
OVERPASS_URL          = "https://overpass-api.de/api/interpreter"
HEADERS               = {"User-Agent": "ServiceAI-Hackathon/1.0 (contact: hackathon@serviceai.pk)"}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _ensure_dir() -> None:
    os.makedirs(RESULTS_DIR, exist_ok=True)


def _extract_phone(text: str) -> str:
    patterns = [
        r"\+92\s?\d{3}[-\s]?\d{7}",
        r"0\d{3}[-\s]?\d{7}",
        r"0\d{10}",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return m.group(0).strip()
    return ""


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def _osm_tags_for(service_type: str) -> List[Dict[str, str]]:
    key = service_type.lower().replace(" ", "_")
    for k, tags in OSM_TAG_MAP.items():
        if k in key or key in k:
            return tags
    # Generic fallback: treat service_type as a shop or craft name
    return [{"shop": key}, {"craft": key}, {"amenity": key}]


# ─── Strategy 1: Nominatim + Overpass ────────────────────────────────────────

async def _reverse_geocode(lat: float, lng: float) -> dict:
    """Return English address components (city, area) for GPS coords via Nominatim.
    Uses zoom=14 for neighbourhood detail; derives city from district field."""
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=10) as client:
            resp = await client.get(
                NOMINATIM_REVERSE_URL,
                params={
                    "lat": lat, "lon": lng,
                    "format": "json",
                    "accept-language": "en",
                    "zoom": 14,
                },
            )
            data = resp.json()
            addr = data.get("address", {})

            # City: Pakistan uses "Lahore District" / "Karachi Division" in district field
            # Prefer that over "town" which is usually a sub-locality (e.g. "Begampura")
            raw_district = addr.get("district", "")
            clean_district = re.sub(
                r'\s+(District|Division|Tehsil|City)$', '', raw_district, flags=re.IGNORECASE
            ).strip()
            city_raw = (addr.get("city")
                        or clean_district
                        or addr.get("city_district") or addr.get("state_district")
                        or addr.get("county") or addr.get("town") or "")
            # Strip administrative suffixes from the city name itself
            city = re.sub(
                r'\s+(District|Division|Tehsil|City)$', '', city_raw, flags=re.IGNORECASE
            ).strip()

            # Area: precise sub-locality (suburb > neighbourhood > quarter > town)
            area = (addr.get("neighbourhood") or addr.get("suburb")
                    or addr.get("quarter") or addr.get("town")
                    or addr.get("village") or addr.get("hamlet") or "")

            state = addr.get("state", "")
            display = ", ".join(filter(None, [area, city, state]))
            print(f"[scraper] Location resolved: {display!r}")
            return {
                "city":    city,
                "area":    area,
                "state":   state,
                "display": display or data.get("display_name", "")[:80],
            }
    except Exception as exc:
        print(f"[scraper] Reverse geocode error: {exc}")
        return {}


async def _geocode_location(location: str) -> Optional[tuple]:
    """Return (lat, lon) for a location string via Nominatim OSM."""
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=10) as client:
            resp = await client.get(NOMINATIM_URL, params={
                "q":      f"{location} Pakistan",
                "format": "json",
                "limit":  1,
            })
            data = resp.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as exc:
        print(f"[scraper] Nominatim error: {exc}")
    return None


async def _overpass_search(
    service_type: str,
    lat: float,
    lon: float,
    radius_m: int = 8000,
    max_results: int = 10,
) -> List[Dict]:
    """Query Overpass API for OSM businesses near a coordinate."""
    tag_groups = _osm_tags_for(service_type)

    # Build node/way queries for each tag combination
    node_queries = ""
    for tags in tag_groups:
        for k, v in tags.items():
            node_queries += f'  node["{k}"="{v}"](around:{radius_m},{lat},{lon});\n'
            node_queries += f'  way["{k}"="{v}"](around:{radius_m},{lat},{lon});\n'

    query = f"""
[out:json][timeout:20];
(
{node_queries}
);
out body center {max_results};
"""
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=25) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            data = resp.json()
    except Exception as exc:
        print(f"[scraper] Overpass error: {exc}")
        return []

    providers = []
    for el in data.get("elements", [])[:max_results]:
        tags = el.get("tags", {})
        el_lat = el.get("lat") or (el.get("center", {}).get("lat"))
        el_lon = el.get("lon") or (el.get("center", {}).get("lon"))
        name = tags.get("name") or tags.get("name:en") or tags.get("name:ur")
        if not name:
            continue
        phone = (
            tags.get("phone")
            or tags.get("contact:phone")
            or tags.get("contact:mobile")
            or ""
        )
        el_type = el.get("type", "node")
        osm_id  = el.get("id")
        providers.append({
            "name":          name,
            "address":       tags.get("addr:full") or tags.get("addr:street", ""),
            "city":          tags.get("addr:city", ""),
            "phone":         phone,
            "website":       tags.get("website") or tags.get("contact:website", ""),
            "source_url":    f"https://www.openstreetmap.org/{el_type}/{osm_id}" if osm_id else "",
            "rating":        None,
            "reviews_count": None,
            "lat":           el_lat,
            "lng":           el_lon,
            "hours":         tags.get("opening_hours"),
            "category":      service_type,
            "source":        "openstreetmap",
            "distance_km":   round(_haversine_km(lat, lon, el_lat, el_lon), 2) if el_lat else None,
            "osm_id":        osm_id,
        })

    print(f"[scraper] Overpass returned {len(providers)} OSM results")
    return providers


# ─── Strategy 2: DuckDuckGo Maps ─────────────────────────────────────────────

def _get_ddgs():
    try:
        from ddgs import DDGS
        return DDGS
    except ImportError:
        pass
    try:
        from duckduckgo_search import DDGS
        return DDGS
    except ImportError:
        return None


def _sync_maps_search(service_type: str, location: str, max_results: int) -> List[Dict]:
    """DuckDuckGo Maps — structured listings with phone, GPS, hours."""
    DDGS = _get_ddgs()
    if DDGS is None:
        return []
    providers = []
    try:
        with DDGS() as ddgs:
            if not hasattr(ddgs, "maps"):
                return []
            for r in ddgs.maps(
                keywords=service_type,
                place=f"{location} Pakistan",
                max_results=max_results,
            ):
                providers.append({
                    "name":          r.get("title", "Unknown Business"),
                    "address":       r.get("address", ""),
                    "city":          r.get("city", ""),
                    "phone":         r.get("phone", "") or _extract_phone(r.get("address", "")),
                    "website":       r.get("website", ""),
                    "source_url":    r.get("url") or r.get("website", ""),
                    "rating":        r.get("rating"),
                    "reviews_count": r.get("reviewsCount"),
                    "lat":           r.get("latitude"),
                    "lng":           r.get("longitude"),
                    "hours":         r.get("hours"),
                    "category":      service_type,
                    "source":        "ddg_maps",
                    "distance_km":   None,
                })
    except Exception as exc:
        print(f"[scraper] DDG Maps error: {exc}")
    print(f"[scraper] DDG Maps returned {len(providers)} results")
    return providers


# ─── Strategy 3: DuckDuckGo Text ─────────────────────────────────────────────

def _sync_text_search(service_type: str, location: str, max_results: int) -> List[Dict]:
    """Multi-query DDG text search — directory-targeted for Pakistan."""
    DDGS = _get_ddgs()
    if DDGS is None:
        return []

    # Multiple query formulations for better coverage
    queries = [
        f"{service_type} service {location} Pakistan phone number contact",
        f"best {service_type} in {location} Pakistan",
        f"{service_type} near me {location} Karachi OR Lahore OR Islamabad contact",
    ]

    seen_urls = set()
    providers = []

    try:
        with DDGS() as ddgs:
            for query in queries:
                if len(providers) >= max_results:
                    break
                for r in ddgs.text(query, max_results=max_results):
                    url = r.get("href", "")
                    if url in seen_urls:
                        continue
                    seen_urls.add(url)
                    body = r.get("body", "")
                    providers.append({
                        "name":          r.get("title", "Unknown"),
                        "address":       location,
                        "city":          location,
                        "phone":         _extract_phone(body),
                        "website":       url,
                        "source_url":    url,
                        "description":   body[:350],
                        "rating":        None,
                        "reviews_count": None,
                        "lat":           None,
                        "lng":           None,
                        "hours":         None,
                        "category":      service_type,
                        "source":        "ddg_text",
                        "distance_km":   None,
                    })
    except Exception as exc:
        print(f"[scraper] DDG Text error: {exc}")

    print(f"[scraper] DDG Text returned {len(providers)} results")
    return providers


# ─── File persistence ─────────────────────────────────────────────────────────

def _slug(s: str, limit: int = 20) -> str:
    return re.sub(r"[^\w]", "_", s.lower())[:limit].strip("_")


def _save_to_file(
    service_type: str,
    location: str,
    city: str,
    providers: List[Dict],
    source: str,
) -> str:
    _ensure_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{_slug(service_type)}_{_slug(location)}_{timestamp}.json"
    filepath = os.path.join(RESULTS_DIR, filename)

    payload = {
        "metadata": {
            "service_type": service_type,
            "location":     location,
            "city":         city,
            "timestamp":    datetime.now().isoformat(),
            "total_found":  len(providers),
            "source":       source,
            "file":         filename,
        },
        "providers": providers,
    }

    with open(filepath, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)

    _update_index(filepath, payload["metadata"])
    return filepath


def _update_index(filepath: str, metadata: dict) -> None:
    try:
        if os.path.exists(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as fh:
                index = json.load(fh)
        else:
            index = {"searches": []}

        index["searches"].append({
            "file": os.path.basename(filepath),
            "path": filepath,
            **metadata,
        })
        index["searches"] = index["searches"][-200:]

        with open(INDEX_FILE, "w", encoding="utf-8") as fh:
            json.dump(index, fh, indent=2, ensure_ascii=False)
    except Exception as exc:
        print(f"[scraper] Index update error: {exc}")


# ─── Public API ───────────────────────────────────────────────────────────────

async def scrape_realtime_providers(
    service_type: str,
    location: str,
    city: str,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    max_results: int = 10,
) -> Dict:
    """
    Scrape real-time local service providers using a 3-strategy pipeline.

    Strategy 1 — OpenStreetMap (Overpass API):
        Geocodes the location via Nominatim, then queries Overpass for
        businesses tagged with OSM service categories. Returns real addresses,
        GPS coordinates, phone numbers, and opening hours where available.

    Strategy 2 — DuckDuckGo Maps:
        Falls back to DDG map search if OSM returns nothing.

    Strategy 3 — DuckDuckGo Text:
        Uses multiple query formulations targeting Pakistani directories.
        Always runs as a supplement to structured results.

    All results are saved to data/scraped_results/<service>_<location>_<ts>.json
    and registered in data/scraped_results/index.json for future agent lookups.
    """
    t0 = time.time()
    providers: List[Dict] = []
    source_used = "none"
    coords = None
    detected = {}

    # ── If GPS provided, use it directly (skip string geocoding) ─────────────
    if user_lat is not None and user_lng is not None:
        coords = (user_lat, user_lng)
        detected = await _reverse_geocode(user_lat, user_lng)
        det_city = detected.get("city") or city
        det_area = detected.get("area") or ""
        # Build a clean English location string for DDG text search
        full_location = detected.get("display") or (
            f"{det_area}, {det_city}".strip(", ") if det_area else det_city
        )
        print(f"[scraper] GPS ({user_lat:.4f},{user_lng:.4f}) -> Location: {full_location!r}")
    else:
        full_location = f"{location} {city}".strip() if location else city
        print(f"[scraper] Starting: {service_type!r} near {full_location!r}")

    # ── Strategy 1: Nominatim geocode + Overpass OSM ──────────────────────────
    if not coords:
        coords = await _geocode_location(full_location)
        if coords:
            print(f"[scraper] Geocoded {full_location!r} -> ({coords[0]:.4f}, {coords[1]:.4f})")
        else:
            print(f"[scraper] Geocoding failed for {full_location!r}")

    if coords:
        lat, lon = coords
        osm_results = await _overpass_search(service_type, lat, lon, max_results=max_results)
        if osm_results:
            providers = osm_results
            source_used = "openstreetmap"

    # ── Strategy 2: DDG Maps (if OSM returned nothing) ────────────────────────
    if not providers:
        ddg_map_results = await asyncio.to_thread(
            _sync_maps_search, service_type, full_location, max_results
        )
        if ddg_map_results:
            providers = ddg_map_results
            source_used = "ddg_maps"

    # ── Strategy 3: DDG Text search (always run as supplement) ───────────────
    text_results = await asyncio.to_thread(
        _sync_text_search, service_type, full_location, max_results
    )
    if not providers:
        providers = text_results
        source_used = "ddg_text"
    elif text_results:
        existing_names = {p["name"].lower() for p in providers}
        for tr in text_results:
            if tr["name"].lower() not in existing_names and tr.get("phone"):
                providers.append(tr)
                existing_names.add(tr["name"].lower())

    providers = providers[:max_results]

    # Attach distance from user GPS if available
    if coords:
        ref_lat, ref_lng = coords
        for p in providers:
            if p.get("lat") and p.get("lng") and not p.get("distance_km"):
                p["distance_km"] = _haversine_km(ref_lat, ref_lng, p["lat"], p["lng"])

    duration_ms = int((time.time() - t0) * 1000)
    det_city_out = detected.get("city") or city

    saved_path = await asyncio.to_thread(
        _save_to_file, service_type, full_location, det_city_out, providers, source_used
    )

    print(f"[scraper] Done - {len(providers)} results in {duration_ms}ms -> {saved_path}")

    det_display = detected.get("display") or full_location
    print(f"[scraper] Location display: {det_display!r}")

    return {
        "found":            len(providers),
        "source":           source_used,
        "saved_to":         saved_path,
        "duration_ms":      duration_ms,
        "location":         full_location,
        "location_display": det_display,
        "detected_area":    detected.get("area", ""),
        "detected_city":    det_city_out,
        "detected_state":   detected.get("state", ""),
        "geocoded_at":      {"lat": coords[0], "lng": coords[1]} if coords else None,
        "service_type":     service_type,
        "providers":        providers,
    }


async def load_scraped_results(file_path: str) -> Dict:
    """Load a previously saved scraping session from file."""
    try:
        with open(file_path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as exc:
        return {"error": str(exc), "file": file_path}


def get_index() -> Dict:
    """Return the search index so agents can find prior scraping sessions."""
    if not os.path.exists(INDEX_FILE):
        return {"searches": []}
    with open(INDEX_FILE, "r", encoding="utf-8") as fh:
        return json.load(fh)
