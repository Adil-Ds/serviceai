import os
import json
from groq import AsyncGroq
from app.models.schemas import BookingConfirmation, FollowUp, FollowUpSchedule
from app.database.db import insert_followups

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

_FALLBACK_TEMPLATES = [
    {
        "trigger": "day_before",
        "trigger_label": "1 Day Before — 8:00 AM",
        "channel": "SMS",
        "message": "Reminder: Your {service} appointment with {provider} is tomorrow at {time}. Booking ID: {bid}",
    },
    {
        "trigger": "day_of",
        "trigger_label": "Day of Service — 2 Hours Before",
        "channel": "Push Notification",
        "message": "{provider} is preparing for your {service} today. They will arrive at {time}. Booking ID: {bid}",
    },
    {
        "trigger": "completion",
        "trigger_label": "After Service — 30 Minutes Later",
        "channel": "In-App",
        "message": "How was your {service} with {provider}? Please rate your experience. Booking ID: {bid}",
    },
]


async def schedule_followups(booking: BookingConfirmation) -> FollowUpSchedule:
    prompt = f"""You are an automated follow-up system for a service booking app in Pakistan.

Booking details:
- Service: {booking.service}
- Provider: {booking.provider_name}
- Date: {booking.date}
- Time: {booking.time_slot}
- Booking ID: {booking.booking_id}
- Customer: {booking.user_name}
- Price: ₨{booking.price_agreed}

Generate exactly 3 follow-up messages. Return ONLY valid JSON array (no markdown):
[
  {{
    "trigger": "day_before",
    "trigger_label": "1 Day Before — 8:00 AM",
    "channel": "SMS",
    "message": "<friendly reminder SMS, mention provider name, date, time>"
  }},
  {{
    "trigger": "day_of",
    "trigger_label": "Day of Service — 2 Hours Before",
    "channel": "Push Notification",
    "message": "<day-of alert, mention provider is on the way, booking ID>"
  }},
  {{
    "trigger": "completion",
    "trigger_label": "After Service — 30 Minutes Later",
    "channel": "In-App",
    "message": "<completion prompt asking to rate the service, mention provider name>"
  }}
]

Keep messages short, friendly, in English. Include booking ID {booking.booking_id}."""

    raw = ""
    try:
        try:
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=512,
            )
        except Exception as api_exc:
            exc_str = str(api_exc)
            if "429" in exc_str or "rate_limit" in exc_str.lower() or "limit reached" in exc_str.lower():
                print("[followup_agent] Rate limit exceeded on llama-3.3-70b-versatile. Falling back to llama-3.1-8b-instant...")
                response = await client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.4,
                    max_tokens=512,
                )
            else:
                raise
        raw = (response.choices[0].message.content or "").strip()
    except Exception as exc:
        print(f"[followup_agent] Groq call failed: {exc}")

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        data = json.loads(raw)
        followups = [FollowUp(**f) for f in data]
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        print(f"[followup_agent] JSON parse failed ({exc}), using fallback templates")
        subs = {
            "service":  booking.service,
            "provider": booking.provider_name,
            "time":     booking.time_slot,
            "bid":      booking.booking_id,
        }
        followups = [
            FollowUp(
                trigger=t["trigger"],
                trigger_label=t["trigger_label"],
                channel=t["channel"],
                message=t["message"].format(**subs),
            )
            for t in _FALLBACK_TEMPLATES
        ]

    insert_followups(booking.booking_id, [f.model_dump() for f in followups])
    return FollowUpSchedule(booking_id=booking.booking_id, followups=followups)
