# Agentic Caller — Architecture

## Overview

The Agentic Caller places outbound voice calls to service providers via VAPI, extracts the outcome from the call transcript using Groq LLM, and returns the result to the mobile app. The mobile app then drives any follow-up calls based on user input.

---

## File Structure

```
app/Agentic_caller/
├── caller.py               VAPI client — builds prompts, places calls, polls transcript
├── transcript_analyzer.py  Groq LLM — extracts outcome from transcript
├── call_store.py           SQLite CRUD for call_logs table
└── ARCHITECTURE.md         This file

app/api/
└── caller_routes.py        FastAPI routes: /api/caller/*

app/models/schemas.py       Pydantic models: InitiateCallRequest, CallConclusion, ConfirmCallRequest
app/database/db.py          init_db() creates call_logs table on startup
```

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/caller/initiate` | Call provider, wait for transcript, return outcome |
| POST | `/api/caller/confirm` | Confirmation or counter-proposal follow-up call |
| GET | `/api/caller/status/{call_log_id}` | Poll call log status |
| POST | `/api/caller/webhook` | VAPI webhook for production (async transcript processing) |

---

## Call Flow

```
Mobile App                    Backend                        Provider Phone
     │                            │                                │
     │── POST /api/caller/initiate▶│                                │
     │                            │──── VAPI outbound call ────────▶│
     │                            │         (polls every 5s)        │
     │                            │◀─── call ends + transcript ─────│
     │                            │  Groq extracts outcome          │
     │                            │  Stores in call_logs table      │
     │◀── CallConclusion ─────────│                                │
     │                            │                                │
  [App shows outcome to user]     │                                │
```

### Outcome: ACCEPTED
```
App shows "Booking Confirmed"
No further calls needed.
```

### Outcome: REJECTED
```
App shows "Provider Declined"
No further calls needed.
```

### Outcome: SUGGESTED_TIME
```
App shows "Provider suggested: Thursday 3pm. Accept or propose another time?"

  User taps ACCEPT
  ─── POST /api/caller/confirm { user_decision: "ACCEPT", confirmed_time: "Thu 3pm" }
      → Confirmation call placed: "Appointment is confirmed for Thursday 3pm"
      → App shows "Confirmed"

  User taps COUNTER (wants Friday instead)
  ─── POST /api/caller/confirm { user_decision: "COUNTER", confirmed_time: "Fri 2pm",
                                  provider_suggested_time: "Thu 3pm" }
      → Follow-up call placed: "Customer proposes Friday 2pm instead, can you do it?"
      → Returns new outcome (loop repeats if provider suggests again)
```

### Outcome: NO_ANSWER
```
Call was not answered / went to voicemail.
App can retry or notify user.
```

---

## VAPI Integration

### How Prompts Work

Every call uses `assistantOverrides` to inject dynamic customer context:

```python
{
  "assistantId": VAPI_ASSISTANT_ID,          # from .env
  "assistantOverrides": {
    "firstMessage": "Hello, am I speaking with Ali Plumbing?...",
    "model": {
      "systemPrompt": "You are a booking coordinator calling on behalf of..."
    }
  },
  "customer": { "number": "+923001234567", "name": "Ali Plumbing" },
  "phoneNumberId": VAPI_PHONE_NUMBER_ID      # from .env (Telnyx DID)
}
```

The dashboard system prompt and first message are fallbacks only — they are overridden on every call.

### Three Prompt Types

| Call Type | Prompt Goal |
|-----------|-------------|
| `INQUIRY` | Ask if provider can take the job at the requested time |
| `CONFIRMATION` | Inform provider the appointment is set |
| `FOLLOWUP` | Relay user's counter-proposed time, ask if provider accepts |

### Polling

`initiate` and `confirm` block synchronously while waiting for the call to end. VAPI is polled every 5 seconds, with a 5-minute timeout.

```
call created → poll GET /call/{id} every 5s → status == "ended" → return transcript
```

Terminal statuses: `ended`, `failed`, `no-answer`, `busy`

---

## Transcript Analysis (Groq RAG)

After every call, the transcript is passed to Groq (`llama-3.3-70b-versatile`) with a structured extraction prompt.

**Output schema:**
```json
{
  "outcome":        "ACCEPTED | REJECTED | SUGGESTED_TIME | NO_ANSWER | ERROR",
  "suggested_time": "Thursday 3pm",
  "reason":         "Provider confirmed availability for the requested slot",
  "confidence":     0.95
}
```

The `reason` field is what the mobile app surfaces to the user as a human-readable status message.

---

## Database — call_logs Table

```sql
CREATE TABLE call_logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id        TEXT UNIQUE,           -- VAPI call ID
    booking_id     TEXT,                  -- optional FK to bookings table
    call_type      TEXT NOT NULL,         -- INQUIRY | CONFIRMATION | FOLLOWUP
    provider_phone TEXT NOT NULL,
    provider_name  TEXT NOT NULL,
    user_name      TEXT NOT NULL,
    service_type   TEXT,
    preferred_time TEXT,
    status         TEXT DEFAULT 'INITIATED',  -- INITIATED | COMPLETED | FAILED | TIMEOUT
    outcome        TEXT,                  -- ACCEPTED | REJECTED | SUGGESTED_TIME | NO_ANSWER
    suggested_time TEXT,
    reason         TEXT,
    transcript     TEXT,
    created_at     TEXT NOT NULL,
    completed_at   TEXT
)
```

Each call (inquiry, confirmation, follow-up) is a separate row. They are linked to a booking via `booking_id` and to each other via `call_log_id` returned to the mobile app.

---

## Environment Variables Required

```
VAPI_API_KEY          — VAPI secret key
VAPI_PHONE_NUMBER_ID  — Telnyx DID imported into VAPI
VAPI_ASSISTANT_ID     — Pre-configured VAPI assistant (voice/TTS settings)
GROQ_API_KEY          — Groq API key (transcript analysis)
```

---

## Testing via FastAPI Docs

Start the server and open `http://localhost:8001/docs`.

**Step 1 — Initiate call** (`POST /api/caller/initiate`):
```json
{
  "provider_phone": "+923001234567",
  "provider_name": "Ali Plumbing Services",
  "user_name": "Ahmed Khan",
  "user_address": "Block 7, Gulshan-e-Iqbal, Karachi",
  "problem": "Water pipe leaking under the kitchen sink",
  "service_type": "Plumber",
  "preferred_time": "Tomorrow at 2pm",
  "booking_id": null
}
```

**Step 2 — Confirm (if SUGGESTED_TIME)** (`POST /api/caller/confirm`):
```json
{
  "call_log_id": 1,
  "provider_phone": "+923001234567",
  "provider_name": "Ali Plumbing Services",
  "user_name": "Ahmed Khan",
  "user_address": "Block 7, Gulshan-e-Iqbal, Karachi",
  "service_type": "Plumber",
  "user_decision": "ACCEPT",
  "confirmed_time": "Thursday 3pm"
}
```

Phone numbers must be E.164 format (`+92XXXXXXXXXX`).
