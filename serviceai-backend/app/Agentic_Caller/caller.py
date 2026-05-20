import os
import asyncio
import httpx

VAPI_API_KEY = os.getenv("VAPI_API_KEY", "")
VAPI_PHONE_NUMBER_ID = os.getenv("VAPI_PHONE_NUMBER_ID", "")
VAPI_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID", "")                          # Urdu inquiry assistant
VAPI_CONFIRM_ASSISTANT_ID = os.getenv("VAPI_CONFIRM_ASSISTANT_ID", "") or os.getenv("VAPI_ASSISTANT_ID", "")  # English confirm assistant
VAPI_BASE_URL = "https://api.vapi.ai"

_POLL_INTERVAL = 5       # seconds between status checks
_MAX_POLL_SECONDS = 300  # give up after 5 minutes
_TERMINAL = {"ended", "failed", "no-answer", "busy"}


# ── Prompt builders ───────────────────────────────────────────────────────────

def _inquiry_first_message(user_name, user_address, problem, service_type, preferred_time, provider_name, language="en"):
    if language == "ur":
        return (
            f"السلام علیکم، کیا میں {provider_name} سے بات کر رہا ہوں؟ "
            f"میں ServiceAI کی طرف سے کال کر رہا ہوں۔ "
            f"{user_name} صاحب کو {user_address} میں {service_type} کی ضرورت ہے۔ "
            f"مسئلہ یہ ہے: {problem}۔ "
            f"وہ {preferred_time} کو یہ کام کروانا چاہتے ہیں۔ "
            f"کیا آپ یہ کام کر سکتے ہیں؟"
        )
    return (
        f"Hello, am I speaking with {provider_name}? "
        f"This is ServiceAI calling on behalf of a customer named {user_name}. "
        f"They are located in {user_address} and need a {service_type} — specifically: {problem}. "
        f"They would like the service on {preferred_time}. "
        f"Are you available to take this job?"
    )


def _confirmation_first_message(user_name, user_address, service_type, confirmed_time, provider_name, language="en"):
    if language == "ur":
        return (
            f"السلام علیکم {provider_name}، یہ ServiceAI کی طرف سے کال ہے۔ "
            f"{user_name} صاحب کے ساتھ {service_type} کا وقت {confirmed_time} پر کنفرم ہو گیا ہے۔ "
            f"پتہ ہے: {user_address}۔ "
            f"کیا آپ کا کوئی سوال ہے؟"
        )
    return (
        f"Hello {provider_name}, this is ServiceAI. "
        f"I am calling to confirm that the appointment with {user_name} "
        f"for {service_type} at {user_address} is confirmed for {confirmed_time}. "
        f"Do you have any questions before the appointment?"
    )


def _followup_first_message(user_name, user_address, service_type,
                             original_time, provider_suggested_time, user_proposed_time, provider_name, language="en"):
    if language == "ur":
        return (
            f"السلام علیکم {provider_name}، میں {user_name} صاحب کی بکنگ کے بارے میں دوبارہ کال کر رہا ہوں۔ "
            f"آپ نے {provider_suggested_time} کا وقت تجویز کیا تھا، "
            f"لیکن گاہک نے {user_proposed_time} کا وقت پیش کیا ہے۔ "
            f"کیا {user_proposed_time} آپ کے لیے ٹھیک رہے گا؟"
        )
    return (
        f"Hello {provider_name}, this is ServiceAI following up on the booking for {user_name} "
        f"regarding {service_type} at {user_address}. "
        f"The customer originally requested {original_time}, you suggested {provider_suggested_time}, "
        f"and now the customer is proposing {user_proposed_time} instead. "
        f"Can you accommodate {user_proposed_time}?"
    )


# ── VAPI client ───────────────────────────────────────────────────────────────

async def create_outbound_call(
    provider_phone: str,
    provider_name: str,
    first_message: str,
    assistant_id: str = None,
) -> dict:
    """Create an outbound VAPI call. Returns the raw VAPI call object."""
    payload = {
        "assistantId": assistant_id or VAPI_ASSISTANT_ID,
        "assistantOverrides": {
            "firstMessage": first_message,
        },
        "customer": {
            "number": provider_phone,
            "name": (provider_name or "")[:40],
        },
        "phoneNumberId": VAPI_PHONE_NUMBER_ID,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{VAPI_BASE_URL}/call/phone",
            json=payload,
            headers={"Authorization": f"Bearer {VAPI_API_KEY}"},
            timeout=30.0,
        )
        if not resp.is_success:
            raise RuntimeError(
                f"VAPI {resp.status_code}: {resp.text}"
            )
        return resp.json()


_POLL_CONNECT_RETRIES = 3   # retry connect-timeout errors this many times
_POLL_RETRY_WAIT = 8        # seconds to wait between connect retries


async def wait_for_call_completion(call_id: str) -> dict:
    """Poll VAPI every 5 s until the call reaches a terminal status."""
    poll_timeout = httpx.Timeout(connect=30.0, read=30.0, write=10.0, pool=5.0)
    async with httpx.AsyncClient() as client:
        for _ in range(_MAX_POLL_SECONDS // _POLL_INTERVAL):
            await asyncio.sleep(_POLL_INTERVAL)
            for attempt in range(_POLL_CONNECT_RETRIES):
                try:
                    resp = await client.get(
                        f"{VAPI_BASE_URL}/call/{call_id}",
                        headers={"Authorization": f"Bearer {VAPI_API_KEY}"},
                        timeout=poll_timeout,
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    if data.get("status", "") in _TERMINAL:
                        return data
                    break  # successful poll, advance to next interval
                except httpx.ConnectTimeout:
                    if attempt < _POLL_CONNECT_RETRIES - 1:
                        await asyncio.sleep(_POLL_RETRY_WAIT)
                        continue
                    raise

    return {"id": call_id, "status": "timeout"}


def extract_transcript(call_data: dict) -> str:
    """Return a readable transcript string from a VAPI call object."""
    raw = call_data.get("transcript", "")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()

    # Fallback: reconstruct from messages array
    messages = call_data.get("messages", [])
    if messages:
        lines = []
        for m in messages:
            role = m.get("role", "unknown").capitalize()
            text = m.get("message") or m.get("content") or ""
            if text:
                lines.append(f"{role}: {text}")
        return "\n".join(lines)

    return ""


# ── High-level call helpers ───────────────────────────────────────────────────

async def call_provider_inquiry(
    provider_phone: str,
    provider_name: str,
    user_name: str,
    user_address: str,
    problem: str,
    service_type: str,
    preferred_time: str,
    language: str = "en",
) -> tuple[str, str, str]:
    """Place an inquiry call to a service provider. Returns (call_id, transcript, status)."""
    first_msg = _inquiry_first_message(user_name, user_address, problem, service_type, preferred_time, provider_name, language)
    call = await create_outbound_call(provider_phone, provider_name, first_msg)
    call_id = call["id"]
    completed = await wait_for_call_completion(call_id)
    return call_id, extract_transcript(completed), completed.get("status", "unknown")


async def call_provider_confirmation(
    provider_phone: str,
    provider_name: str,
    user_name: str,
    user_address: str,
    service_type: str,
    confirmed_time: str,
    language: str = "en",
) -> tuple[str, str, str]:
    """Place a confirmation call to tell the provider the appointment is set. Returns (call_id, transcript, status)."""
    first_msg = _confirmation_first_message(user_name, user_address, service_type, confirmed_time, provider_name, language)
    call = await create_outbound_call(provider_phone, provider_name, first_msg, assistant_id=VAPI_CONFIRM_ASSISTANT_ID)
    call_id = call["id"]
    completed = await wait_for_call_completion(call_id)
    return call_id, extract_transcript(completed), completed.get("status", "unknown")


async def call_provider_followup(
    provider_phone: str,
    provider_name: str,
    user_name: str,
    user_address: str,
    service_type: str,
    original_time: str,
    provider_suggested_time: str,
    user_proposed_time: str,
    language: str = "en",
) -> tuple[str, str, str]:
    """Follow-up call when the user counter-proposes a different time. Returns (call_id, transcript, status)."""
    first_msg = _followup_first_message(
        user_name, user_address, service_type,
        original_time, provider_suggested_time, user_proposed_time, provider_name, language
    )
    call = await create_outbound_call(provider_phone, provider_name, first_msg, assistant_id=VAPI_CONFIRM_ASSISTANT_ID)
    call_id = call["id"]
    completed = await wait_for_call_completion(call_id)
    return call_id, extract_transcript(completed), completed.get("status", "unknown")
