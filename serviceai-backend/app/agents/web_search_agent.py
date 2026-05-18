"""
Web Search Agent — fallback when no providers found in the local database.
Uses DuckDuckGo to find real businesses with contact details.
"""

import asyncio
import re
from typing import List, Dict


def _extract_phone(text: str) -> str:
    """Extract Pakistani phone number from text."""
    patterns = [
        r"0\d{3}[-\s]?\d{7}",   # 0300-1234567
        r"\+92\s?\d{3}[-\s]?\d{7}",  # +92 300 1234567
        r"0\d{10}",               # 03001234567
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return m.group(0).strip()
    return ""


def _sync_ddg_search(query: str, max_results: int) -> List[Dict]:
    try:
        from ddgs import DDGS
    except ImportError:
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            print("[web_search] Neither 'ddgs' nor 'duckduckgo_search' is installed.")
            return []
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                phone = _extract_phone(r.get("body", ""))
                results.append({
                    "name":        r.get("title", "Unknown Business"),
                    "description": r.get("body", "")[:300],
                    "url":         r.get("href", ""),
                    "phone":       phone,
                    "source":      "web",
                })
        return results
    except Exception as exc:
        print(f"[web_search] DuckDuckGo search failed: {exc}")
        return []


async def web_search_providers(
    service_category: str,
    area: str,
    city: str,
) -> List[Dict]:
    """
    Search DuckDuckGo for service businesses when the local database has none.
    Returns up to 5 results with name, description, phone (if found), and URL.
    """
    location = f"{area} {city}".strip() if area else city
    query = (
        f"{service_category.replace('_', ' ')} near {location} Pakistan "
        f"contact number phone address"
    )
    print(f"[web_search] Querying: {query}")
    results = await asyncio.to_thread(_sync_ddg_search, query, 5)
    print(f"[web_search] Got {len(results)} results")
    return results
