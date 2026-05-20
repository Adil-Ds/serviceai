import os
import re
import json
from groq import Groq

_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

_SYSTEM = """You are analyzing a phone call transcript between a booking coordinator and a service provider.
The conversation may be in Urdu, English, or a mix of both.

You will be given the ORIGINALLY REQUESTED TIME. Your job is to determine whether the provider
accepted THAT EXACT TIME, suggested a DIFFERENT time, rejected the job, or did not answer.

Return ONLY valid JSON matching this schema:
{{
  "outcome": "ACCEPTED" | "REJECTED" | "SUGGESTED_TIME" | "NO_ANSWER",
  "suggested_time": "<string in English if SUGGESTED_TIME, else null>",
  "reason": "<one sentence in English summarizing what the provider said>",
  "confidence": <0.0 to 1.0>
}}

STRICT RULES — read carefully:
- ACCEPTED: provider explicitly agreed to the EXACT same time as the originally requested time. No change.
- SUGGESTED_TIME: provider mentioned ANY time at all — even slightly different (e.g. requested "7:00", provider said "6:00" → SUGGESTED_TIME). If the provider says a time and it differs in ANY way from the originally requested time, use SUGGESTED_TIME.
- REJECTED: provider declined entirely and offered NO alternative time.
- NO_ANSWER: call was not answered, went to voicemail, or only the AI spoke with no human response.

CRITICAL: Do NOT confuse a different time with acceptance. If requested was "Sunday 7:00" and provider says "Sunday 6 PM" or "شام چھ بجے" — that is SUGGESTED_TIME, NOT ACCEPTED.
- For suggested_time: always write the time in English (e.g. "Sunday 6pm") even if the provider spoke in Urdu.
- reason must always be in English.
- When in doubt between ACCEPTED and SUGGESTED_TIME, always choose SUGGESTED_TIME."""


_AI_ROLES = {"ai", "bot", "assistant", "system"}


def _human_lines(transcript: str) -> str:
    """
    Return only the provider/human side of the transcript.
    Lines prefixed with AI/Bot/Assistant roles are excluded to avoid false keyword matches.
    """
    lines = transcript.splitlines()
    human = []
    has_role_prefix = False
    for line in lines:
        if ":" in line:
            role = line.split(":", 1)[0].strip().lower()
            if role in _AI_ROLES:
                has_role_prefix = True
                continue
            has_role_prefix = True
        human.append(line)

    if has_role_prefix and not human:
        return ""
    return " ".join(human) if human else transcript


def _extract_clock_times(text: str) -> list[str]:
    """Pull out clock-style time tokens: HH:MM, H:MM, H am/pm, HH:MM am/pm."""
    return re.findall(r'\b\d{1,2}:\d{2}(?:\s*[ap]m)?\b|\b\d{1,2}\s*[ap]m\b', text, re.IGNORECASE)


def _times_conflict(reason: str, requested_time: str) -> str | None:
    """
    Return the conflicting time string if reason mentions a clock time that does NOT
    appear in requested_time, else None.
    """
    reason_times = _extract_clock_times(reason)
    if not reason_times:
        return None
    req_lower = requested_time.lower()
    for rt in reason_times:
        # Normalize: strip spaces around colon, lowercase
        normalized = re.sub(r'\s+', '', rt).lower()
        if normalized not in req_lower and rt.lower() not in req_lower:
            return rt
    return None


def _postprocess(result: dict, requested_time: str, transcript: str) -> dict:
    """
    Catch cases where Groq says ACCEPTED but the reason or provider lines
    contain a clock time that differs from the requested time.
    """
    if result.get("outcome") != "ACCEPTED" or not requested_time:
        return result

    # Check Groq's own reason field for a different time
    conflict = _times_conflict(result.get("reason", ""), requested_time)

    # Also check provider lines directly
    if not conflict:
        provider_text = _human_lines(transcript)
        provider_times = _extract_clock_times(provider_text)
        req_lower = requested_time.lower()
        for pt in provider_times:
            normalized = re.sub(r'\s+', '', pt).lower()
            if normalized not in req_lower and pt.lower() not in req_lower:
                conflict = pt
                break

    if conflict:
        return {
            "outcome": "SUGGESTED_TIME",
            "suggested_time": conflict,
            "reason": result.get("reason", f"Provider suggested a different time: {conflict}."),
            "confidence": result.get("confidence", 0.7),
        }

    return result


def _keyword_fallback(transcript: str) -> dict:
    """
    Simple keyword-based extraction when Groq fails or returns empty.
    Only inspects the provider/human side of the transcript.
    """
    provider_text = _human_lines(transcript)

    if not provider_text.strip():
        return {"outcome": "NO_ANSWER", "suggested_time": None,
                "reason": "Provider did not respond during the call.", "confidence": 0.7}

    t = provider_text.lower()

    time_match = re.search(r'\b(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm|بجے|بج))\b', provider_text, re.IGNORECASE)

    reject_words = ["نہیں", "نہ", "no ", "can't", "cannot", "not available", "unavailable"]
    is_rejected = any(w in t for w in reject_words)

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
    Falls back to keyword extraction if Groq fails.
    Returns a dict with keys: outcome, suggested_time, reason, confidence.
    """
    if not transcript or len(transcript.strip()) < 20:
        return {
            "outcome": "NO_ANSWER",
            "suggested_time": None,
            "reason": "Call was not answered or transcript is empty.",
            "confidence": 1.0,
        }

    user_content = f"Originally requested time: {requested_time or 'not specified'}\n\nTranscript:\n{transcript}"

    for attempt in range(2):
        try:
            resp = _client.chat.completions.create(
                model="llama-3.3-70b-versatile",
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
                    continue
                break

            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            result = json.loads(raw.strip())
            for key in ("outcome", "suggested_time", "reason", "confidence"):
                if key not in result:
                    raise ValueError(f"Missing key: {key}")

            # Guard against Groq reasoning errors
            return _postprocess(result, requested_time, transcript)

        except (json.JSONDecodeError, ValueError):
            if attempt == 0:
                continue
            break
        except Exception:
            break

    return _keyword_fallback(transcript)
