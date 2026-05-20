import os
import re
import json
from groq import Groq

_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

_SYSTEM = """You are analyzing a phone call transcript between a booking coordinator and a service provider.
The conversation may be in Urdu, English, or a mix of both. Understand accordingly.

You will be given the ORIGINALLY REQUESTED TIME. Use it to decide the outcome.

Extract the provider's final decision. Return ONLY valid JSON matching this schema:
{{
  "outcome": "ACCEPTED" | "REJECTED" | "SUGGESTED_TIME" | "NO_ANSWER",
  "suggested_time": "<string in English if SUGGESTED_TIME, else null>",
  "reason": "<one sentence in English summarizing what the provider said>",
  "confidence": <0.0 to 1.0>
}}

Rules:
- ACCEPTED: provider agreed to the ORIGINALLY REQUESTED TIME (same time, no change)
- REJECTED: provider declined entirely with no alternative
- SUGGESTED_TIME: provider mentioned ANY time that is different from the originally requested time
- NO_ANSWER: call was not answered, went to voicemail, or transcript is empty
- For suggested_time, always write the time in English (e.g. "Monday 4pm") even if said in Urdu
- reason must always be in English regardless of transcript language
- If unsure whether the suggested time matches the requested time, treat it as SUGGESTED_TIME
- confidence reflects how clearly the decision came across"""


def _keyword_fallback(transcript: str) -> dict:
    """
    Simple keyword-based extraction when Groq fails or returns empty.
    Looks for time patterns and Urdu/English accept/reject signals.
    """
    print(transcript)

    # Look for a time pattern like 04:00, 4pm, 4 baje, چار بجے etc.
    time_match = re.search(r'\b(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm|بجے|بج))\b', transcript, re.IGNORECASE)

    # Rejection signals
    reject_words = ["نہیں", "نہ", "no ", "can't", "cannot", "not available", "unavailable"]
    is_rejected = any(w in t for w in reject_words)

    # Acceptance signals
    accept_words = ["ہاں", "جی", "بالکل", "ٹھیک ہے", "yes", "sure", "okay", "ok"]
    is_accepted = any(w in t for w in accept_words)

    if is_rejected and not time_match:
        return {"outcome": "REJECTED", "suggested_time": None,
                "reason": "Provider indicated unavailability.", "confidence": 0.6}

    if time_match:
        return {"outcome": "SUGGESTED_TIME", "suggested_time": time_match.group(0),
                "reason": f"Provider suggested a time: {time_match.group(0)}.", "confidence": 0.6}

    if is_accepted:
        return {"outcome": "ACCEPTED", "suggested_time": None,
                "reason": "Provider agreed to take the job.", "confidence": 0.6}

    return {"outcome": "NO_ANSWER", "suggested_time": None,
            "reason": "Could not determine outcome from transcript.", "confidence": 0.3}


def analyze_provider_response(transcript: str, requested_time: str = "") -> dict:
    """
    Use Groq to extract the provider's decision from a call transcript.
    requested_time is the original time asked for — used to detect SUGGESTED_TIME correctly.
    Falls back to keyword extraction if Groq returns empty or fails.
    Returns a dict with keys: outcome, suggested_time, reason, confidence.
    """
    if not transcript or len(transcript.strip()) < 20:
        return {
            "outcome": "NO_ANSWER",
            "suggested_time": None,
            "reason": "Call was not answered or transcript is empty.",
            "confidence": 1.0,
        }
    print(transcript)

    user_content = f"Originally requested time: {requested_time or 'not specified'}\n\nTranscript:\n{transcript}"

    for attempt in range(2):
        try:
            resp = _client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": user_content},
                ],
                temperature=0,
                max_tokens=256,
            )
            raw = resp.choices[0].message.content.strip()

            if not raw:
                if attempt == 0:
                    continue  # retry once
                break  # both attempts returned empty → fall through to keyword fallback

            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            result = json.loads(raw.strip())
            for key in ("outcome", "suggested_time", "reason", "confidence"):
                if key not in result:
                    raise ValueError(f"Missing key: {key}")
            return result

        except (json.JSONDecodeError, ValueError):
            if attempt == 0:
                continue  # retry once on bad JSON
            break
        except Exception:
            break  # rate limit or network error → fall through

    # Groq failed — use keyword fallback so we never return ERROR
    return _keyword_fallback(transcript)
