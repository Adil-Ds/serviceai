"""
pipeline.py — LLM-driven business finder with geocoding + scoring
-----------------------------------------------------------------
The LLM calls the scraper as a tool, then we enrich each business
with geocoded distance and a composite score. The LLM reads the
raw text file and the enriched data to write a final report.

Usage:
    # Full run — scrape + evaluate + report (visible browser)
    python pipeline.py "electrician" "DHA Phase 5, Lahore"
    python pipeline.py "carpenter" "F-7, Islamabad" --results 5 --out ./reports

    # Evaluation only — skip scraping, reuse a previous JSON snapshot
    python pipeline.py --from-json ./electrician_lahore_data.json

NOTE: Do NOT use --headless. Google detects headless Chrome and returns
      an empty/blocked page. Always run with a visible browser window.
"""

import argparse
import json
import math
import os
import re
import random
import sys
import time
from pathlib import Path


import requests
from dotenv import load_dotenv
from groq import Groq

# Load .env from serviceai-backend root (3 levels up from this file)
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

def create_completion_with_fallback(client, **kwargs):
    model = kwargs.get("model", "llama-3.3-70b-versatile")
    fallbacks = ["llama-3.1-8b-instant", "llama3-8b-8192", "gemma2-9b-it"]
    try:
        return client.chat.completions.create(**kwargs)
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "rate_limit" in err_str.lower() or "limit reached" in err_str.lower():
            print(f"\n[pipeline] Rate limit exceeded on model '{model}'. Attempting automatic fallback...")
            for fb in fallbacks:
                if fb == model:
                    continue
                try:
                    print(f"[pipeline] Trying fallback model '{fb}'...")
                    kwargs["model"] = fb
                    return client.chat.completions.create(**kwargs)
                except Exception as ex:
                    print(f"[pipeline] Fallback to '{fb}' failed: {ex}")
        raise e

# Allow bare `import scraper` since pipeline.py lives next to scraper.py
sys.path.insert(0, str(Path(__file__).parent))
import scraper as _scraper


# ── Geocoding (Nominatim / OpenStreetMap — free, no key needed) ────────────────

_NOM_HEADERS = {"User-Agent": "AutoBooker-Pipeline/1.0"}


def _nominatim(query: str) -> tuple[float, float] | None:
    """Single Nominatim lookup; returns (lat, lon) or None."""
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1},
            headers=_NOM_HEADERS,
            timeout=10,
        )
        data = r.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None


def geocode(address: str) -> tuple[float, float] | None:
    """
    Return (lat, lon) for an address string, or None on failure.

    Falls back progressively for non-standard addresses:
      1. Full address as-is
      2. Strip 5-6 digit postal codes  e.g. "54600"
      3. Drop the first token (often a market/building name)
      4. City + country only  (rough, but better than nothing)
    """
    if not address or address.strip() in ("N/A", "and nearby areas"):
        return None

    # Build a list of progressively simpler queries to try
    parts = [p.strip() for p in address.split(",") if p.strip()]
    queries = [address]

    # Remove postal code tokens (pure digit strings 4-6 chars)
    no_zip = ", ".join(p for p in parts if not re.fullmatch(r"\d{4,6}", p))
    if no_zip != address:
        queries.append(no_zip)

    # Drop the first part (building/market name) and retry without zip
    if len(parts) >= 3:
        no_first = ", ".join(
            p for p in parts[1:] if not re.fullmatch(r"\d{4,6}", p)
        )
        queries.append(no_first)

    # City + country only as last resort
    if len(parts) >= 2:
        queries.append(", ".join(parts[-2:]))

    for q in dict.fromkeys(queries):  # deduplicate while preserving order
        result = _nominatim(q)
        if result:
            if q != address:
                print(f"[geocode] fallback succeeded: {q!r}")
            return result
        time.sleep(1.1)  # respect Nominatim rate limit between retries

    print(f"[geocode] failed for: {address!r}")
    return None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Straight-line distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(max(0.0, a)))


# ── Scoring ────────────────────────────────────────────────────────────────────
#
#  Total: 100 pts
#   Rating       0–40  (rating / 5 * 40)
#   Review count 0–30  (log scale; ~1 000 reviews earns full 30)
#   Distance     0–30  (0 km → 30 pts, each km costs 3 pts, floor at 0)
#
# Review count is used as a proxy for business experience / longevity.


def _parse_review_count(raw) -> int:
    digits = re.sub(r"[^\d]", "", str(raw or "0"))
    return int(digits) if digits else 0


def score_business(b: dict, user_lat: float, user_lon: float) -> dict:
    rating = float(b.get("rating") or 0)
    reviews = _parse_review_count(b.get("review_count"))

    rating_score = round((rating / 5.0) * 40, 1)
    review_score = round(min(30.0, math.log1p(reviews) / math.log1p(1000) * 30), 1)

    distance_km = None
    distance_score = 0.0
    biz_coords = geocode(b.get("address", ""))
    if biz_coords:
        distance_km = round(haversine_km(user_lat, user_lon, *biz_coords), 2)
        distance_score = round(max(0.0, 30.0 - distance_km * 3.0), 1)

    return {
        "rating_score": rating_score,
        "review_score": review_score,
        "distance_km": distance_km,
        "distance_score": distance_score,
        "total_score": round(rating_score + review_score + distance_score, 1),
    }


# ── Tool definition (Groq / OpenAI-compatible) ─────────────────────────────────

_TOOL = {
    "type": "function",
    "function": {
        "name": "scrape_businesses",
        "description": (
            "Scrape Google local listings for a service type near an address. "
            "Returns business details: name, rating, review count, address, phone, "
            "website, and customer reviews."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "service": {
                    "type": "string",
                    "description": 'Service to find, e.g. "electrician", "plumber".',
                },
                "address": {
                    "type": "string",
                    "description": 'Location to search near, e.g. "DHA Phase 5, Lahore".',
                },
            },
            "required": ["service", "address"],
        },
    },
}

_SYSTEM_PROMPT = """\
You are ServiceFinder AI — an expert local business analyst.
You have one tool: scrape_businesses. It finds real Google-listed businesses.

Workflow:
1. Call scrape_businesses with the service type and address the user needs.
2. After the tool returns you will receive enriched business data that includes
   ratings, review counts, distances, composite scores, phone numbers and addresses.
   You will also receive the raw scraped text file for additional context.
3. Write a clear, structured plain-text report recommending the best choice.

Your report MUST contain:
  • A ranked summary table with these exact columns:
      Rank | Name | Rating | Reviews | Distance | Phone | Address | Score
  • A 2–3 sentence analysis for each business covering strengths and weaknesses
    based on review sentiment, rating, experience (review count) and proximity.
  • A clear Final Recommendation section with your rationale.

Use plain text formatting (ASCII table or aligned columns). Be factual —
use only the numbers and text provided, never invent data.
"""


# ── Pipeline ───────────────────────────────────────────────────────────────────

def _save_json(service: str, location: str, businesses: list, out_dir: str) -> str:
    """Save raw business dicts as a JSON snapshot alongside the txt file."""
    os.makedirs(out_dir, exist_ok=True)
    from datetime import datetime
    ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
    slug = re.sub(r"\W+", "_", f"{service}_{location}").lower().strip("_")
    path = os.path.join(out_dir, f"{slug}_{ts}_data.json")
    payload = {"service": service, "address": location, "businesses": businesses}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"[pipeline] JSON snapshot -> {path}")
    return path


def run_pipeline(
    service: str = "",
    user_address: str = "",
    max_results: int = random.randint(2, 5),
    max_reviews: int = 10,
    headless: bool = False,
    out_dir: str = ".",
    model: str = "llama-3.3-70b-versatile",
    from_json: str = "",
) -> dict:
    """
    Full pipeline: scrape → geocode → score → LLM report.

    Pass from_json=<path> to skip scraping and reuse a previous JSON snapshot.
    Returns a dict:
        report       — LLM plain-text report string
        businesses   — scored + ranked business list
        service      — service type searched
        address      — user address searched
        txt_path     — path to raw scraped txt file
        report_path  — path to saved report txt file
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

   

    txt_path   = ""
    txt_content = ""
    tool_call_id = "mock-tool-call"

    # ── Mode A: load from existing JSON snapshot (skip scraping) ──────────────
    if from_json:
        print(f"\n[pipeline] Loading from JSON: {from_json}")
        with open(from_json, encoding="utf-8") as f:
            snapshot = json.load(f)
        svc        = snapshot.get("service", service or "unknown")
        addr       = snapshot.get("address", user_address or "unknown")
        businesses = snapshot.get("businesses", [])
        if not businesses:
            raise RuntimeError(f"[!] JSON file has no businesses: {from_json}")
        print(f"[pipeline] Loaded {len(businesses)} businesses  service={svc!r}  address={addr!r}")

        # Look for a txt file in the same directory with the same slug prefix
        slug = re.sub(r"\W+", "_", f"{svc}_{addr}").lower().strip("_")
        candidates = [
            p for p in Path(os.path.dirname(from_json) or ".").iterdir()
            if p.name.startswith(slug) and p.suffix == ".txt"
        ]
        if candidates:
            txt_path = str(sorted(candidates)[-1])  # most recent
            with open(txt_path, encoding="utf-8") as f:
                txt_content = f.read()
            print(f"[pipeline] Found matching txt file: {txt_path}")

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Find the best {svc} near '{addr}'. "
                    "I have already scraped the data. Score and rank the businesses."
                ),
            },
            # Simulate the LLM tool call + result so the conversation is coherent
            {
                "role": "assistant",
                "content": None,
                "tool_calls": [{
                    "id": tool_call_id,
                    "type": "function",
                    "function": {
                        "name": "scrape_businesses",
                        "arguments": json.dumps({"service": svc, "address": addr}),
                    },
                }],
            },
        ]

    # ── Mode B: full run — LLM triggers the scraper ───────────────────────────
    else:
        svc  = service
        addr = user_address

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Find the best {svc} near '{addr}'. "
                    f"Scrape up to {max_results} results, then score and rank them."
                ),
            },
        ]

        print(f"\n[pipeline] service={svc!r}  address={addr!r}")

        # ── 1. LLM calls the scraper tool ─────────────────────────────────────
        print("[pipeline] Asking LLM to invoke scrape tool...")
        resp = create_completion_with_fallback(
            client,
            model=model,
            messages=messages,
            tools=[_TOOL],
            tool_choice="required",
            max_tokens=256,
        )

        msg = resp.choices[0].message
        if not msg.tool_calls:
            raise RuntimeError("[!] LLM did not call the scraper tool. Aborting.")

        tool_call    = msg.tool_calls[0]
        tool_call_id = tool_call.id
        tool_args    = json.loads(tool_call.function.arguments)
        svc  = tool_args.get("service", svc)
        addr = tool_args.get("address", addr)
        print(f"[pipeline] LLM called scrape_businesses({svc!r}, {addr!r})")

        messages.append(msg)

        # ── 2. Run the scraper ─────────────────────────────────────────────────
        print("[pipeline] Running scraper (this may take a few minutes)...")
        businesses = _scraper.scrape(
            service=svc,
            location=addr,
            max_results=max_results,
            max_reviews=max_reviews,
            out_dir=out_dir,
            headless=headless,
        )

        if not businesses:
            err = "[!] Scraper returned no businesses. Try without --headless."
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": json.dumps({"error": err}),
            })
            raise RuntimeError(err)

        txt_path = _scraper.save_txt(svc, addr, businesses, out_dir)
        _save_json(svc, addr, businesses, out_dir)
        print(f"[pipeline] Scraped {len(businesses)} businesses. Text file: {txt_path}")

        if txt_path and os.path.exists(txt_path):
            with open(txt_path, encoding="utf-8") as f:
                txt_content = f.read()

    # ── 3. Geocode user address ───────────────────────────────────────────────
    print(f"[pipeline] Geocoding user address: {addr!r}")
    user_coords = geocode(addr)
    if user_coords:
        user_lat, user_lon = user_coords
        print(f"[pipeline] User coords: lat={user_lat:.5f}  lon={user_lon:.5f}")
    else:
        print("[pipeline] Could not geocode user address — distance scoring skipped")
        user_lat = user_lon = None

    # ── 4. Geocode each business and compute scores ────────────────────────────
    print("[pipeline] Scoring businesses...")
    enriched = []
    for i, b in enumerate(businesses, 1):
        name = b.get("name") or f"Business {i}"
        if user_lat is not None:
            time.sleep(1.1)  # Nominatim: max 1 request/second
            scores = score_business(b, user_lat, user_lon)
            dist_str = (
                f"{scores['distance_km']} km" if scores["distance_km"] is not None else "unknown"
            )
            print(
                f"  [{i}] {name[:40]:<40} "
                f"rating={b.get('rating') or '?'}  "
                f"reviews={b.get('review_count') or '?'}  "
                f"dist={dist_str}  "
                f"score={scores['total_score']}"
            )
        else:
            scores = {
                "rating_score": 0.0,
                "review_score": 0.0,
                "distance_km": None,
                "distance_score": 0.0,
                "total_score": 0.0,
            }
        enriched.append({**b, **scores})

    enriched.sort(key=lambda x: x["total_score"], reverse=True)

    # ── 6. Build tool result payload for the LLM ──────────────────────────────
    biz_list = []
    for rank, b in enumerate(enriched, 1):
        reviews_snippet = [
            {"stars": rv.get("stars"), "text": (rv.get("text") or "")[:200]}
            for rv in (b.get("reviews") or [])[:5]
        ]
        biz_list.append({
            "rank":           rank,
            "name":           b.get("name"),
            "rating":         b.get("rating"),
            "review_count":   b.get("review_count"),
            "address":        b.get("address"),
            "phone":          b.get("phone"),
            "website":        b.get("website"),
            "distance_km":    b.get("distance_km"),
            "rating_score":   b.get("rating_score"),
            "review_score":   b.get("review_score"),
            "distance_score": b.get("distance_score"),
            "total_score":    b.get("total_score"),
            "reviews":        reviews_snippet,
        })

    tool_payload = {
        "scraped_count": len(businesses),
        "user_address":  addr,
        "txt_file":      txt_path,
        "scoring_notes": (
            "total_score is out of 100: "
            "rating_score (0-40) + review_score (0-30, log-scaled) + "
            "distance_score (0-30, 0km=30pts, each km costs 3pts)."
        ),
        "businesses": biz_list,
    }

    messages.append({
        "role": "tool",
        "tool_call_id": tool_call_id,
        "content": json.dumps(tool_payload),
    })

    # Also give the LLM the raw text file (truncated to keep context manageable)
    if txt_content:
        messages.append({
            "role": "user",
            "content": (
                "Here is the raw scraped text file for additional context:\n\n"
                f"```\n{txt_content[:5000]}\n```\n\n"
                "Now write the full analysis report."
            ),
        })

    # ── 7. LLM writes the report ───────────────────────────────────────────────
    print("[pipeline] Generating LLM report...")
    report_resp = create_completion_with_fallback(
        client,
        model=model,
        messages=messages,
        max_tokens=2048,
    )
    report = report_resp.choices[0].message.content or ""

    # ── 8. Save report ─────────────────────────────────────────────────────────
    if txt_path:
        report_path = txt_path.replace(".txt", "_report.txt")
    else:
        os.makedirs(out_dir, exist_ok=True)
        report_path = os.path.join(out_dir, f"{re.sub(r'\\W+', '_', svc).lower()}_report.txt")

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"[pipeline] Report saved -> {report_path}")

    return {
        "report":      report,
        "businesses":  enriched,
        "service":     svc,
        "address":     addr,
        "txt_path":    txt_path,
        "report_path": report_path,
    }


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="LLM Business Finder Pipeline — scrape → geocode → score → report",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            '  python pipeline.py "electrician" "DHA Phase 5, Lahore"\n'
            "  python pipeline.py --from-json ./electrician_dha_data.json\n"
        ),
    )
    parser.add_argument("service",  nargs="?", default="",
                        help='Service type  e.g. "electrician"  (omit when using --from-json)')
    parser.add_argument("address",  nargs="?", default="",
                        help='User address  e.g. "DHA Phase 5, Lahore"  (omit when using --from-json)')
    parser.add_argument("--from-json", metavar="PATH", default="",
                        help="Skip scraping — load businesses from a previous *_data.json snapshot")
    parser.add_argument("--results",   type=int, default=5,
                        help="Max businesses to scrape (default 5, ignored with --from-json)")
    parser.add_argument("--reviews",   type=int, default=10,
                        help="Max reviews per business (default 10, ignored with --from-json)")
    parser.add_argument("--out",       default=".",
                        help="Output directory for txt + report files")
    parser.add_argument("--model",     default="llama-3.3-70b-versatile",
                        help="Groq model ID")
    args = parser.parse_args()

    if not args.from_json and not args.service:
        parser.error("Provide 'service' and 'address', or use --from-json <path>.")

    try:
        result = run_pipeline(
            service      = args.service,
            user_address = args.address,
            max_results  = args.results,
            max_reviews  = args.reviews,
            out_dir      = args.out,
            model        = args.model,
            from_json    = args.from_json,
        )
    except RuntimeError as e:
        print(f"\n[!] {e}")
        sys.exit(1)

    print("\n" + "=" * 72)
    print("FINAL REPORT")
    print("=" * 72)
    print(result["report"])
