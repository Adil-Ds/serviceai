import traceback
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request

from app.models.schemas import InitiateCallRequest, CallConclusion, ConfirmCallRequest
from app.Agentic_Caller.caller import (
    call_provider_inquiry,
    call_provider_confirmation,
    call_provider_followup,
)
from app.Agentic_Caller.transcript_analyzer import analyze_provider_response
from app.Agentic_Caller.call_store import (
    insert_call_log,
    update_call_log,
    get_call_log,
    get_call_log_by_vapi_id,
)
from app.database.db import (
    insert_booking,
    update_booking_status,
    update_booking_confirmed,
    update_pending_booking,
    cancel_booking,
)

_OUTBOUND_PHONE = "+923324214692"  # demo line — all VAPI calls route here


def _create_confirmed_booking(body: InitiateCallRequest, confirmed_time: str) -> str:
    """Confirm a booking. If one already exists (PENDING AI booking), flip it to CONFIRMED. Otherwise create new."""
    if body.booking_id:
        update_booking_confirmed(body.booking_id, confirmed_time)
        return body.booking_id
    booking_id = f"BK-{uuid.uuid4().hex[:6].upper()}"
    insert_booking({
        "booking_id":       booking_id,
        "provider_id":      body.provider_phone,
        "provider_name":    body.provider_name,
        "service":          body.service_type or "Service",
        "user_id":          body.user_id,
        "user_name":        body.user_name,
        "user_location":    None,
        "location_address": body.user_address or "",
        "date":             confirmed_time,
        "time_slot":        confirmed_time,
        "price_agreed":     0,
        "status":           "CONFIRMED",
        "phone":            body.provider_phone,
        "created_at":       datetime.now(timezone.utc).isoformat(),
    })
    return booking_id


def _create_pending_booking(body: InitiateCallRequest, suggested_time: str, log_id: int) -> str:
    """
    Create a PENDING booking when the provider suggests an alternative time.
    Uses a unique time_slot key so negotiation doesn't conflict with confirmed slots.
    The booking stays PENDING until the user accepts or rejects.
    """
    booking_id = f"BK-{uuid.uuid4().hex[:6].upper()}"
    # time_slot uses the call log id to guarantee uniqueness during negotiation
    insert_booking({
        "booking_id":       booking_id,
        "provider_id":      body.provider_phone,
        "provider_name":    body.provider_name,
        "service":          body.service_type or "Service",
        "user_id":          body.user_id,
        "user_name":        body.user_name,
        "user_location":    None,
        "location_address": body.user_address or "",
        "date":             datetime.now(timezone.utc).date().isoformat(),
        "time_slot":        f"pending_{log_id}",
        "price_agreed":     0,
        "status":           "PENDING",
        "phone":            body.provider_phone,
        "created_at":       datetime.now(timezone.utc).isoformat(),
        "suggested_time":   suggested_time,
        "call_log_id":      log_id,
    })
    return booking_id

router = APIRouter(prefix="/api/caller")


# ── 1. Initiate inquiry call to provider ─────────────────────────────────────

@router.post("/initiate", response_model=CallConclusion)
async def initiate_call(body: InitiateCallRequest):
    """
    Places an outbound call to the service provider, waits for it to end,
    runs Groq analysis on the transcript, and returns the outcome.

    Outcomes:
      ACCEPTED        → provider agreed to the requested time
      REJECTED        → provider declined entirely
      SUGGESTED_TIME  → provider offered an alternative time
      NO_ANSWER       → call not answered / voicemail
    """
    # Insert a pending call log row
    log_id = insert_call_log(
        call_type="INQUIRY",
        provider_phone=body.provider_phone,
        provider_name=body.provider_name,
        user_name=body.user_name,
        user_address=body.user_address,
        problem=body.problem,
        service_type=body.service_type,
        preferred_time=body.preferred_time,
        language=body.language,
        booking_id=body.booking_id,
    )

    try:
        call_id, transcript, call_status = await call_provider_inquiry(
            provider_phone=_OUTBOUND_PHONE,
            provider_name=body.provider_name,
            user_name=body.user_name,
            user_address=body.user_address,
            problem=body.problem,
            service_type=body.service_type,
            preferred_time=body.preferred_time,
            language=body.language,
        )
    except Exception as exc:
        traceback.print_exc()
        update_call_log(log_id, status="FAILED", reason=str(exc),
                        completed_at=datetime.now(timezone.utc).isoformat())
        raise HTTPException(status_code=502, detail=f"VAPI call failed: {exc}")

    # Analyze the transcript
    analysis    = analyze_provider_response(transcript, requested_time=body.preferred_time)
    outcome     = analysis["outcome"]
    suggested   = analysis.get("suggested_time")
    booking_id  = None

    # Persist the completed call
    update_call_log(
        log_id,
        call_id=call_id,
        status="COMPLETED" if call_status == "ended" else call_status.upper(),
        outcome=outcome,
        suggested_time=suggested,
        reason=analysis.get("reason", ""),
        transcript=transcript,
        completed_at=datetime.now(timezone.utc).isoformat(),
    )

    # Create or update booking based on outcome
    if outcome == "ACCEPTED":
        try:
            booking_id = _create_confirmed_booking(body, body.preferred_time)
            update_call_log(log_id, booking_id=booking_id)
        except Exception as be:
            print(f"[INITIATE] ⚠️  Booking create failed: {be}")
    elif outcome == "SUGGESTED_TIME" and suggested:
        try:
            booking_id = _create_pending_booking(body, suggested, log_id)
            update_call_log(log_id, booking_id=booking_id)
        except Exception as be:
            print(f"[INITIATE] ⚠️  Pending booking create failed: {be}")

    return CallConclusion(
        call_log_id=log_id,
        call_id=call_id,
        outcome=outcome,
        suggested_time=suggested,
        reason=analysis.get("reason", ""),
        confidence=analysis.get("confidence", 0.0),
        transcript=transcript,
        call_status=call_status,
        booking_id=booking_id,
    )


# ── 2. Confirm / follow-up call ───────────────────────────────────────────────

@router.post("/confirm", response_model=CallConclusion)
async def confirm_call(body: ConfirmCallRequest):
    """
    Called after the user responds to the provider's outcome.
    All context (phone, name, address, times) is loaded from the original call log.

    user_decision = ACCEPT:
        Calls provider to confirm the appointment at the time they suggested.

    user_decision = COUNTER:
        Calls provider with the user's newly proposed time (user_proposed_time required).
        Returns the provider's updated outcome.
    """
    # Load full context from the original call log
    origin = get_call_log(body.call_log_id)
    if not origin:
        raise HTTPException(status_code=404, detail=f"Call log {body.call_log_id} not found")

    if body.user_decision == "COUNTER" and not body.user_proposed_time:
        raise HTTPException(status_code=400, detail="user_proposed_time is required when user_decision is COUNTER")

    # ── REJECT: user declines provider's suggested time — no VAPI call needed ──
    if body.user_decision == "REJECT":
        update_call_log(
            body.call_log_id,
            outcome="USER_REJECTED",
            reason="User declined the provider's suggested time.",
            completed_at=datetime.now(timezone.utc).isoformat(),
        )
        existing_booking_id = origin.get("booking_id")
        if existing_booking_id:
            try:
                cancel_booking(existing_booking_id)
            except Exception:
                pass
        print(f"[CONFIRM] ❌  User REJECTED — call log #{body.call_log_id}, booking cancelled")
        return CallConclusion(
            call_log_id=body.call_log_id,
            outcome="USER_REJECTED",
            reason="User declined the provider's suggested time.",
            booking_id=existing_booking_id,
        )

    confirmed_time = (
        origin["suggested_time"] if body.user_decision == "ACCEPT"
        else body.user_proposed_time
    )

    lang = origin.get("language") or "en"

    log_id = insert_call_log(
        call_type="CONFIRMATION" if body.user_decision == "ACCEPT" else "FOLLOWUP",
        provider_phone=origin["provider_phone"],
        provider_name=origin["provider_name"],
        user_name=origin["user_name"],
        user_address=origin.get("user_address"),
        problem=origin.get("problem"),
        service_type=origin.get("service_type"),
        preferred_time=confirmed_time,
        language=lang,
        booking_id=origin.get("booking_id"),
    )

    try:
        if body.user_decision == "ACCEPT":
            call_id, transcript, call_status = await call_provider_confirmation(
                provider_phone=_OUTBOUND_PHONE,
                provider_name=origin["provider_name"],
                user_name=origin["user_name"],
                user_address=origin.get("user_address") or "",
                service_type=origin.get("service_type") or "",
                confirmed_time=confirmed_time,
                language=lang,
            )
        else:  # COUNTER
            call_id, transcript, call_status = await call_provider_followup(
                provider_phone=_OUTBOUND_PHONE,
                provider_name=origin["provider_name"],
                user_name=origin["user_name"],
                user_address=origin.get("user_address") or "",
                service_type=origin.get("service_type") or "",
                original_time=origin.get("preferred_time") or "",
                provider_suggested_time=origin.get("suggested_time") or "",
                user_proposed_time=body.user_proposed_time,
                language=lang,
            )
    except Exception as exc:
        traceback.print_exc()
        update_call_log(log_id, status="FAILED", reason=str(exc),
                        completed_at=datetime.now(timezone.utc).isoformat())
        raise HTTPException(status_code=502, detail=f"VAPI call failed: {exc}")

    analysis = analyze_provider_response(transcript, requested_time=confirmed_time)
    new_outcome   = analysis["outcome"]
    new_suggested = analysis.get("suggested_time")

    update_call_log(
        log_id,
        call_id=call_id,
        status="COMPLETED" if call_status == "ended" else call_status.upper(),
        outcome=new_outcome,
        suggested_time=new_suggested,
        reason=analysis.get("reason", ""),
        transcript=transcript,
        completed_at=datetime.now(timezone.utc).isoformat(),
    )

    # ── Booking state machine ────────────────────────────────────────────────
    existing_booking_id = origin.get("booking_id")
    result_booking_id   = existing_booking_id  # may be updated below

    if new_outcome == "ACCEPTED":
        try:
            from app.models.schemas import InitiateCallRequest as _IR
            _fake = _IR(
                provider_phone=origin["provider_phone"],
                provider_name=origin["provider_name"],
                user_name=origin["user_name"],
                user_address=origin.get("user_address") or "",
                problem=origin.get("problem") or "",
                service_type=origin.get("service_type") or "Service",
                preferred_time=confirmed_time,
                language=origin.get("language") or "en",
                booking_id=existing_booking_id,
            )
            result_booking_id = _create_confirmed_booking(_fake, confirmed_time)
            update_call_log(log_id, booking_id=result_booking_id)
            print(f"[CONFIRM] 🎉  Booking CONFIRMED → ID={result_booking_id}")
        except Exception as be:
            print(f"[CONFIRM] ⚠️   Booking confirm failed: {be}")

    elif new_outcome == "SUGGESTED_TIME" and new_suggested:
        # Provider suggested yet another time — keep booking PENDING with updated time
        try:
            if existing_booking_id:
                update_pending_booking(existing_booking_id, new_suggested, log_id)
                update_call_log(log_id, booking_id=existing_booking_id)
                print(f"[CONFIRM] ⏳  Booking still PENDING → updated suggested_time={new_suggested}")
            else:
                # No prior booking (unusual path) — create one
                from app.models.schemas import InitiateCallRequest as _IR
                _fake = _IR(
                    provider_phone=origin["provider_phone"],
                    provider_name=origin["provider_name"],
                    user_name=origin["user_name"],
                    user_address=origin.get("user_address") or "",
                    problem=origin.get("problem") or "",
                    service_type=origin.get("service_type") or "Service",
                    preferred_time=confirmed_time,
                    language=origin.get("language") or "en",
                )
                result_booking_id = _create_pending_booking(_fake, new_suggested, log_id)
                update_call_log(log_id, booking_id=result_booking_id)
                print(f"[CONFIRM] ⏳  New PENDING booking created → ID={result_booking_id}")
        except Exception as be:
            print(f"[CONFIRM] ⚠️   Pending booking update failed: {be}")

    elif new_outcome in ("REJECTED", "USER_REJECTED"):
        if existing_booking_id:
            try:
                cancel_booking(existing_booking_id)
                print(f"[CONFIRM] ❌  Booking CANCELLED → ID={existing_booking_id}")
            except Exception as be:
                print(f"[CONFIRM] ⚠️   Cancel failed: {be}")

    return CallConclusion(
        call_log_id=log_id,
        call_id=call_id,
        outcome=new_outcome,
        suggested_time=new_suggested,
        reason=analysis.get("reason", ""),
        confidence=analysis.get("confidence", 0.0),
        transcript=transcript,
        call_status=call_status,
        booking_id=result_booking_id,
    )


# ── 3. VAPI webhook (production) ─────────────────────────────────────────────

@router.post("/webhook")
async def vapi_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    VAPI sends call lifecycle events here.
    Only `call-ended` is processed — updates the matching call_log with the
    transcript and runs Groq analysis in the background.
    """
    payload = await request.json()
    event_type = payload.get("message", {}).get("type") or payload.get("type", "")

    if event_type != "end-of-call-report":
        return {"received": True}

    call_obj = payload.get("message", {}).get("call") or payload.get("call", {})
    call_id = call_obj.get("id", "")
    transcript = call_obj.get("transcript", "") or ""

    def _process():
        log = get_call_log_by_vapi_id(call_id)
        if not log:
            return
        analysis = analyze_provider_response(transcript)
        update_call_log(
            log["id"],
            status="COMPLETED",
            outcome=analysis["outcome"],
            suggested_time=analysis.get("suggested_time"),
            reason=analysis.get("reason", ""),
            transcript=transcript,
            completed_at=datetime.now(timezone.utc).isoformat(),
        )

    background_tasks.add_task(_process)
    return {"received": True}


# ── 4. Async initiate — returns call_log_id immediately, call runs in background ─

async def _run_inquiry_bg(log_id: int, body: InitiateCallRequest):
    """Background coroutine: place VAPI call, analyze, and persist result."""
    print(f"\n[BG #{log_id}] 📡  VAPI call starting → {body.provider_name}")
    try:
        call_id, transcript, call_status = await call_provider_inquiry(
            provider_phone=_OUTBOUND_PHONE,
            provider_name=body.provider_name,
            user_name=body.user_name,
            user_address=body.user_address,
            problem=body.problem,
            service_type=body.service_type,
            preferred_time=body.preferred_time,
            language=body.language,
        )
        print(f"[BG #{log_id}] ✅  Call ended  |  VAPI call_id={call_id}  status={call_status}")
        preview = transcript[:300].replace("\n", " | ") if transcript else "<empty>"
        print(f"[BG #{log_id}] 📝  Transcript ({len(transcript)} chars): {preview}")
        print(f"[BG #{log_id}] 🧠  Analyzing transcript ({len(transcript)} chars)...")
        analysis = analyze_provider_response(transcript, requested_time=body.preferred_time)
        print(f"[BG #{log_id}] 📊  Outcome={analysis['outcome']}  confidence={analysis.get('confidence', '?')}")
        print(f"[BG #{log_id}] 💬  Reason: {analysis.get('reason', 'n/a')}")
        update_call_log(
            log_id,
            call_id=call_id,
            status="COMPLETED" if call_status == "ended" else call_status.upper(),
            outcome=analysis["outcome"],
            suggested_time=analysis.get("suggested_time"),
            reason=analysis.get("reason", ""),
            transcript=transcript,
            completed_at=datetime.now(timezone.utc).isoformat(),
        )
        print(f"[BG #{log_id}] 💾  Call log updated.")

        outcome = analysis["outcome"]
        suggested = analysis.get("suggested_time")
        if outcome == "ACCEPTED":
            try:
                booking_id = _create_confirmed_booking(body, body.preferred_time)
                update_call_log(log_id, booking_id=booking_id)
                print(f"[BG #{log_id}] 🎉  Booking CONFIRMED → ID={booking_id}\n")
            except Exception as be:
                print(f"[BG #{log_id}] ⚠️   Booking insert failed: {be}\n")
        elif outcome == "SUGGESTED_TIME" and suggested:
            try:
                booking_id = _create_pending_booking(body, suggested, log_id)
                update_call_log(log_id, booking_id=booking_id)
                print(f"[BG #{log_id}] ⏳  Booking PENDING (provider suggested {suggested}) → ID={booking_id}\n")
            except Exception as be:
                print(f"[BG #{log_id}] ⚠️   Pending booking insert failed: {be}\n")
        else:
            print(f"[BG #{log_id}] ℹ️   No booking created (outcome={outcome})\n")

    except Exception as exc:
        traceback.print_exc()
        err_msg = str(exc) or type(exc).__name__
        print(f"[BG #{log_id}] ❌  Call FAILED: {err_msg}\n")
        try:
            update_call_log(
                log_id,
                status="FAILED",
                reason=err_msg,
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
        except Exception:
            pass
        update_call_log(
            log_id,
            status="FAILED",
            reason=str(exc),
            completed_at=datetime.now(timezone.utc).isoformat(),
        )


@router.post("/initiate-async")
async def initiate_call_async(body: InitiateCallRequest, background_tasks: BackgroundTasks):
    """
    Non-blocking variant of /initiate.
    Inserts the call log immediately and fires the VAPI call in a background task.
    Returns { call_log_id, status } so the mobile app can poll /status/{id}.
    """
    print("\n" + "="*60)
    print("🤖  AI AGENT BOOKING REQUEST RECEIVED")
    print("="*60)
    print(f"  Provider : {body.provider_name}")
    print(f"  Service  : {body.service_type}")
    print(f"  User     : {body.user_name}  @  {body.user_address}")
    print(f"  Problem  : {body.problem}")
    print(f"  Time     : {body.preferred_time}  |  Lang: {body.language}")
    print(f"  BookingID: {body.booking_id or 'n/a'}")
    print("="*60)

    log_id = insert_call_log(
        call_type="INQUIRY",
        provider_phone=body.provider_phone,
        provider_name=body.provider_name,
        user_name=body.user_name,
        user_address=body.user_address,
        problem=body.problem,
        service_type=body.service_type,
        preferred_time=body.preferred_time,
        language=body.language,
        booking_id=body.booking_id,
    )

    print(f"  ✅  Call log created  →  ID #{log_id}")
    print(f"  📞  Dispatching VAPI call in background...")
    print("="*60 + "\n")

    background_tasks.add_task(_run_inquiry_bg, log_id, body)
    return {"call_log_id": log_id, "status": "INITIATED"}


# ── 5. Status polling ─────────────────────────────────────────────────────────

@router.get("/status/{call_log_id}")
async def get_call_status(call_log_id: int):
    """
    Returns the current state of a call log entry.
    Mobile app can poll this after POST /api/caller/initiate.
    """
    log = get_call_log(call_log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Call log not found")
    return log


@router.get("/pending")
async def list_pending_calls():
    """
    Returns all call logs still in INITIATED status.
    Used by the mobile app on startup to resume polling for in-progress calls.
    """
    from app.Agentic_Caller.call_store import get_pending_call_logs
    return get_pending_call_logs()


# ── 5. Custom LLM endpoint (VAPI → our server) ───────────────────────────────

_INQUIRY_GOODBYE = "ٹھیک ہے، میں صارف کو بتا دیتا ہوں۔ خدا حافظ۔"
_CONFIRM_GOODBYE = "Perfect, thank you. Goodbye."


@router.post("/vapi-llm")
async def vapi_custom_llm(request: Request):
    """
    VAPI calls this instead of OpenAI/Anthropic when Custom LLM is configured.
    Logic: after the provider speaks once → return the goodbye line and end the call.
    Set this URL in VAPI assistant → Model → Custom LLM.
    """
    body = await request.json()
    messages = body.get("messages", [])

    # Detect call type from the system prompt language
    system_content = next((m.get("content", "") for m in messages if m.get("role") == "system"), "")
    is_urdu = "اردو" in system_content or "صارف" in system_content

    # Count how many times the provider (user role) has spoken
    provider_turns = [m for m in messages if m.get("role") == "user"]

    if len(provider_turns) >= 1:
        reply = _INQUIRY_GOODBYE if is_urdu else _CONFIRM_GOODBYE
    else:
        reply = ""

    return {
        "id": "chatcmpl-serviceai",
        "object": "chat.completion",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": reply},
            "finish_reason": "stop",
        }],
    }
