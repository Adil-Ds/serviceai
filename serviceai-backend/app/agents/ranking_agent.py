import math
from app.models.schemas import Provider, RankedProvider, ParsedIntent

AREA_COORDS = {
    "Gulshan-e-Iqbal": (24.9200, 67.1050),
    "DHA": (24.8100, 67.0750),
    "DHA Lahore": (31.4650, 74.4000),
    "Nazimabad": (24.9150, 67.0380),
    "Clifton": (24.8100, 67.0250),
    "North Karachi": (24.9750, 67.0580),
    "Gulberg": (31.5150, 74.3520),
    "Model Town": (31.4790, 74.3220),
    "Johar Town": (31.4650, 74.2650),
}


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def compute_score(provider: Provider, user_lat: float, user_lng: float, budget: int | None) -> tuple[float, float, dict]:
    dist = haversine_km(user_lat, user_lng, provider.lat, provider.lng)
    dist_score    = max(0, 100 - (dist * 10))
    rating_score  = (provider.rating / 5.0) * 100
    reviews_score = min(provider.review_count / 50.0, 1.0) * 100
    price_score   = max(0, 100 - ((provider.price_min / budget) * 100)) if budget and budget > 0 else 70.0
    total = (dist_score * 0.35) + (rating_score * 0.35) + (price_score * 0.20) + (reviews_score * 0.10)
    breakdown = {
        "distance_km":    round(dist, 1),
        "distance_score": round(dist_score, 1),
        "rating_score":   round(rating_score, 1),
        "price_score":    round(price_score, 1),
        "reviews_score":  round(reviews_score, 1),
        "total":          round(total, 1),
    }
    return round(total, 1), round(dist, 1), breakdown


def generate_reason(provider: Provider, rank: int, breakdown: dict, intent: ParsedIntent) -> str:
    dist   = breakdown["distance_km"]
    rating = provider.rating
    price  = provider.price_min
    badge  = "Verified · " if provider.verified else ""

    if rank == 1:
        if dist <= 2.0:
            return f"{badge}Closest at {dist} km with a strong {rating}/5 rating."
        return f"{badge}Highest composite score — {rating}/5 rating, ₨{price:,} starting price."
    if rank == 2:
        return f"{badge}{rating}/5 rated, {dist} km away, priced from ₨{price:,}."
    return f"{badge}Reliable choice — {provider.review_count} reviews, {dist} km, ₨{price:,}."


async def rank_providers(
    providers: list[Provider],
    intent: ParsedIntent,
    user_lat: float | None = None,
    user_lng: float | None = None,
) -> list[RankedProvider]:
    if user_lat is None or user_lng is None:
        fallback = AREA_COORDS.get(intent.area) or AREA_COORDS.get("Gulshan-e-Iqbal")
        user_lat, user_lng = fallback

    scored = []
    for p in providers:
        score, dist, breakdown = compute_score(p, user_lat, user_lng, intent.budget_max_pkr)
        scored.append((p, score, dist, breakdown))

    scored.sort(key=lambda x: x[1], reverse=True)

    ranked = []
    for i, (p, score, dist, breakdown) in enumerate(scored[:3]):
        reason = generate_reason(p, i + 1, breakdown, intent)
        ranked.append(RankedProvider(
            provider=p,
            score=score,
            distance_km=dist,
            score_breakdown=breakdown,
            reason=reason,
            rank=i + 1,
        ))

    return ranked
