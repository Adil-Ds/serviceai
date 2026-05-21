# ServiceAI — Agentic Service Provider Matching & Booking

> Built for the **Google Antigravity Hackathon — Al Seekho Phase II**, Challenge 2.

ServiceAI lets a user describe any service need in plain Urdu or English and an autonomous AI pipeline finds real local providers, ranks them, places an actual voice call to the best match, and returns a confirmed booking — all without the user doing anything except typing one sentence.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Running](#setup--running)
  - [Backend](#backend)
  - [Mobile App](#mobile-app)
- [Agent Pipeline](#agent-pipeline)
- [Agentic Caller (Voice)](#agentic-caller-voice)
- [Real-Time Scraper](#real-time-scraper)
- [API Reference](#api-reference)
- [Demo Scenarios](#demo-scenarios)
- [Environment Variables](#environment-variables)

---

## What It Does

```
User types:  "mujhe kal Gulshan mein plumber chahiye, 2000 se zyada nahi"
             ↓
Agent 1 — Intent Parser:   plumber · Gulshan · Karachi · tomorrow · ₨2000 max
             ↓
Agent 2 — Live Scraper:    Fetches real business listings from the web in real time
             ↓
Agent 3 — Provider Search: Filters the local database of providers
             ↓
Agent 4 — Ranking Engine:  Scores each provider (distance 35% · rating 35% · price 20% · reviews 10%)
             ↓
Agent 5 — Voice Caller:    Places an actual outbound call to the top provider via VAPI
             ↓
Agent 6 — Follow-Up:       Schedules 3 automated follow-up reminders
             ↓
User sees:   Ranked providers with AI reasoning · booking receipt #BK-XXXX · follow-up schedule
```

The entire reasoning trace is streamed live to the mobile app screen so users can watch each agent step execute in real time.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        ServiceAI                             │
│                                                              │
│  📱 EXPO MOBILE APP                                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Auth Stack   →  Splash → Welcome → Login / Register  │  │
│  │  User Stack   →  Search → Reasoning → Results →       │  │
│  │                  Booking → Confirmation → Follow-Up    │  │
│  │  Provider Stack → Dashboard → Bookings → Profile      │  │
│  └───────────────────────────┬────────────────────────────┘  │
│                              │ REST / SSE                    │
│  ⚙️  FASTAPI BACKEND  (port 8001)                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  POST /api/analyze          ← full agentic pipeline    │  │
│  │  GET  /api/analyze/stream   ← SSE live events          │  │
│  │  POST /api/caller/initiate  ← place voice call         │  │
│  │  POST /api/caller/confirm   ← follow-up / confirm      │  │
│  │  POST /api/scrape           ← real-time web scrape     │  │
│  │  POST /api/find-business    ← Google Maps scraper      │  │
│  │  POST /api/book             ← create booking           │  │
│  │  POST /api/schedule-followups                          │  │
│  └───────────────────────────┬────────────────────────────┘  │
│                              │                               │
│  🧠 GROQ FUNCTION-CALLING ORCHESTRATION                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  llama-3.3-70b-versatile decides which tools to call   │  │
│  │  and in what order — not a fixed sequential pipeline   │  │
│  │                                                        │  │
│  │  Tools: parse_intent · scrape_realtime_providers ·     │  │
│  │         search_providers · rank_providers ·            │  │
│  │         search_web_providers · ask_clarification       │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│  📞 AGENTIC CALLER (VAPI)                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Places real outbound calls to providers               │  │
│  │  Groq analyzes transcript → ACCEPTED / REJECTED /      │  │
│  │  SUGGESTED_TIME / NO_ANSWER                            │  │
│  │  Multi-turn negotiation loop if provider counters      │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│  💾 DATA LAYER                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  providers.json   — 50 mock providers (Karachi/Lahore) │  │
│  │  bookings.db      — SQLite (bookings + call_logs)      │  │
│  │  scraped_results/ — cached live scrape JSON files      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend

| Layer | Tool | Version |
|-------|------|---------|
| Framework | FastAPI | ≥ 0.104 |
| Server | Uvicorn | ≥ 0.24 |
| LLM / Agent orchestration | Groq (`llama-3.3-70b-versatile`) | ≥ 0.9 |
| Voice calls | VAPI (Telnyx DID) | — |
| Database | SQLite (built-in) | — |
| Validation | Pydantic v2 | ≥ 2.5 |
| Web scraping | DuckDuckGo Maps + Selenium + BeautifulSoup | — |
| Geocoding | Nominatim (OpenStreetMap) | — |

### Mobile App

| Layer | Tool | Version |
|-------|------|---------|
| Framework | React Native | 0.81.5 |
| Build toolchain | Expo SDK | 54 |
| Navigation | React Navigation v7 | — |
| Maps | react-native-maps | 1.20.1 |
| Auth | Firebase Auth + Firestore | ^10.14 |
| Streaming | SSE (EventSource) | — |

---

## Project Structure

```
serviceai/
├── README.md
├── doc/                        ← all project documentation
│
├── serviceai-backend/          ← FastAPI Python backend
│   ├── main.py                 ← app entry point, registers all routers
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── data/
│   │   ├── providers.json      ← 50 mock providers (7 categories, Karachi + Lahore)
│   │   ├── bookings-past.db    ← seeded demo bookings
│   │   └── scraped_results/    ← cached real-time scrape results
│   └── app/
│       ├── agents/
│       │   ├── agentic_runner.py     ← Groq function-calling orchestration loop
│       │   ├── intent_agent.py       ← Agent 1: parse user text → structured intent
│       │   ├── search_agent.py       ← Agent 2: filter providers.json
│       │   ├── ranking_agent.py      ← Agent 3: score + reason each provider
│       │   ├── booking_agent.py      ← Agent 4: SQLite write + booking ID
│       │   ├── followup_agent.py     ← Agent 5: generate follow-up schedule
│       │   ├── realtime_scraper.py   ← DuckDuckGo Maps live scrape
│       │   ├── web_search_agent.py   ← fallback web search
│       │   └── tools.py              ← tool definitions for Groq function-calling
│       ├── Agentic_Caller/
│       │   ├── caller.py             ← VAPI client: place/poll outbound calls
│       │   ├── transcript_analyzer.py← Groq: extract outcome from transcript
│       │   ├── call_store.py         ← call_logs SQLite CRUD
│       │   └── ARCHITECTURE.md
│       ├── Agentic_booker/
│       │   ├── pipeline.py           ← Google Maps scraper + scoring + LLM report
│       │   └── scraper.py            ← Selenium-based Google Maps scraper
│       ├── api/
│       │   ├── routes.py             ← all /api/* REST endpoints
│       │   ├── streaming.py          ← GET /api/analyze/stream (SSE)
│       │   └── caller_routes.py      ← all /api/caller/* endpoints
│       ├── models/
│       │   └── schemas.py            ← all Pydantic request/response models
│       └── database/
│           └── db.py                 ← SQLite init + all CRUD helpers
│
└── serviceai-mobile/           ← Expo React Native app
    ├── App.js                  ← root navigator (auth-aware)
    ├── app.json                ← Expo config
    ├── index.js
    ├── package.json
    └── src/
        ├── screens/
        │   ├── auth/           ← Splash, Welcome, Login, Register
        │   ├── user/           ← Search, Reasoning, Results, Booking,
        │   │                      Confirmation, Follow-Up, Dashboard,
        │   │                      Profile, History, Settings
        │   └── provider/       ← Dashboard, BookingRequests, Profile
        ├── components/
        │   ├── BookingModal.jsx
        │   ├── MapSearchOverlay.jsx
        │   └── ui/             ← shared UI primitives
        ├── services/
        │   └── api.js          ← all backend API calls
        ├── config/
        │   ├── constants.js    ← BASE_URL and feature flags
        │   └── firebase.js     ← Firebase init
        └── constants/
            └── theme.js        ← design tokens (colors, spacing, fonts)
```

---

## Setup & Running

### Backend

**Requirements:** Python 3.11+, Chrome browser (for Selenium scraper)

```bash
cd serviceai-backend

# Install dependencies
pip install -r requirements.txt

# Create .env with your API keys (see Environment Variables section)
cp .env.example .env   # edit the file

# Start the server
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

API docs auto-generated at `http://localhost:8001/docs`.

### Mobile App

**Requirements:** Node.js 18+, Expo Go app on your phone (for device testing)

```bash
cd serviceai-mobile

# Install dependencies
npm install --legacy-peer-deps

# Update the backend URL (replace with your machine's local IP)
# Edit src/config/constants.js → BASE_URL

# Start Expo dev server
npx expo start          # scan QR with Expo Go app
npx expo start --web    # run in browser
npx expo start --android
```

---

## Agent Pipeline

The orchestration is driven by Groq's function-calling API. The LLM (`llama-3.3-70b-versatile`) receives the user's query plus six registered tools and decides which to call, in what order, and whether to retry.

### Tools Available to the LLM

| Tool | What It Does |
|------|-------------|
| `parse_intent` | Extracts structured fields from raw Urdu/English text: `service_category`, `city`, `area`, `budget_max_pkr`, `urgency` |
| `scrape_realtime_providers` | Queries DuckDuckGo Maps for live business listings: names, addresses, phone numbers, ratings, GPS coordinates |
| `search_providers` | Filters the local `providers.json` database by service category, city, and area |
| `rank_providers` | Scores filtered providers using: distance (35%) + rating (35%) + price (20%) + reviews (10%). Groq generates a one-sentence plain-English reason for each rank |
| `search_web_providers` | Fallback: DuckDuckGo web search for service providers |
| `ask_clarification` | Returns a clarification question to the user when the service type cannot be determined |

### Execution Flow (typical)

```
1. parse_intent("mujhe plumber chahiye Gulshan mein")
   → { service: "plumber", city: "Karachi", area: "Gulshan" }

2. scrape_realtime_providers(service="plumber", city="Karachi", area="Gulshan")
   → [ Ali Plumbing +9230012..., Karachi Pipes +9233..., ... ]

3. search_providers(service="plumber", city="Karachi", area="Gulshan")
   → found: 3 providers from local DB

4. rank_providers(providers=[...], intent={...})
   → ranked list with scores + reasons

5. LLM writes final 2-3 sentence summary
```

Each tool call is recorded in `tool_call_trace` and streamed live to the mobile app via SSE.

### Live Streaming (SSE)

```
GET /api/analyze/stream?q=plumber+Gulshan
```

Events emitted:

| Event | Payload |
|-------|---------|
| `agent_start` | `{ step, tool, tool_display_name, icon, args, status: "running" }` |
| `agent_done` | `{ step, tool, summary, duration_ms, status: "success" | "error" }` |
| `complete` | `{ ranked_providers, gemini_final_reasoning, intent, total_duration_ms, ... }` |
| `clarification` | `{ clarification, tool_call_trace }` |
| `error` | `{ message }` |

---

## Agentic Caller (Voice)

The Agentic Caller places real outbound voice calls to service providers using VAPI, then uses Groq to extract the outcome from the call transcript.

### Call Flow

```
Mobile App                 Backend                   Provider Phone
    │                          │                            │
    │── POST /api/caller/initiate ──▶│                      │
    │                          │── VAPI outbound call ─────▶│
    │                          │   (polls every 5s)         │
    │                          │◀── call ends + transcript ─│
    │                          │  Groq extracts outcome     │
    │◀── CallConclusion ────────│                           │
```

### Outcomes

| Outcome | What Happens |
|---------|-------------|
| `ACCEPTED` | Booking created as `CONFIRMED` in SQLite |
| `REJECTED` | No booking, user notified |
| `SUGGESTED_TIME` | Booking created as `PENDING`; app asks user to accept or counter-propose |
| `NO_ANSWER` | No booking; app can retry |

### Multi-Turn Negotiation

If the provider suggests an alternative time (`SUGGESTED_TIME`), the mobile app shows the user two options: **Accept** or **Counter**. Either action triggers a follow-up call via `POST /api/caller/confirm`. This loop continues until the outcome is `ACCEPTED`, `REJECTED`, or `USER_REJECTED`.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/caller/initiate` | Blocking: place call, wait, return outcome |
| POST | `/api/caller/initiate-async` | Non-blocking: returns `call_log_id` immediately |
| POST | `/api/caller/confirm` | Follow-up or confirmation call |
| GET | `/api/caller/status/{id}` | Poll call log status |
| GET | `/api/caller/pending` | List calls still in INITIATED state |
| POST | `/api/caller/webhook` | VAPI webhook (production async flow) |

---

## Real-Time Scraper

Two scraping modes are available:

### DuckDuckGo Maps Scraper (`/api/scrape`)

Fast, lightweight. Uses the `ddgs` Python library to query DuckDuckGo Maps. Returns business name, address, phone, rating, and GPS coordinates. Results are cached as JSON files in `data/scraped_results/`.

```json
POST /api/scrape
{
  "service_type": "electrician",
  "location": "DHA Phase 5",
  "city": "Lahore",
  "user_lat": 31.4697,
  "user_lng": 74.4228,
  "max_results": 10
}
```

### Google Maps Scraper (`/api/find-business`)

Deep scrape using Selenium + undetected-chromedriver. Extracts full business listings from Google Maps including reviews, photos, and opening hours. Geocodes each address with Nominatim and scores businesses with the same formula as the ranking agent. Generates an LLM report. Takes 3–8 minutes.

```json
POST /api/find-business
{
  "service": "plumber",
  "address": "Block 7, Gulshan-e-Iqbal, Karachi",
  "max_results": 5
}
```

---

## API Reference

### Core Pipeline

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analyze` | Full agentic pipeline (Groq orchestration) |
| GET | `/api/analyze/stream` | Same pipeline, streamed as SSE |
| POST | `/api/parse-intent` | Agent 1 only |
| POST | `/api/search-providers` | Agent 2 only |
| POST | `/api/rank-providers` | Agent 3 only |
| POST | `/api/book` | Agent 4 — create booking |
| POST | `/api/schedule-followups` | Agent 5 — generate follow-up messages |

### Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/providers` | List all 50 mock providers |
| GET | `/api/bookings` | All bookings (optional `?user_id=`) |
| GET | `/api/bookings/{id}` | Single booking by ID |
| PUT | `/api/bookings/{id}/status` | Provider accepts / declines |
| GET | `/api/provider/bookings/{provider_id}` | Provider's bookings |
| GET | `/api/booked-slots/{provider_id}/{date}` | Already-booked time slots |
| GET | `/api/followups/{booking_id}` | Follow-up messages for a booking |
| GET | `/api/analytics` | User analytics (requires `?user_id=`) |

### Scraping

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/scrape` | DuckDuckGo Maps live scrape |
| GET | `/api/scrape/index` | Index of all past scrape sessions |
| GET | `/api/scrape/file?path=...` | Load a cached scrape result |
| POST | `/api/find-business` | Google Maps deep scrape + LLM report |

---

## Demo Scenarios

### Scenario A — Plumber in Roman Urdu
```
"mujhe kal Gulshan mein plumber chahiye, 2000 se zyada nahi"
Expected: plumber · Gulshan Karachi · tomorrow · ₨2000 max
          → 3 providers ranked, Ali's Plumbing wins, booking confirmed
```

### Scenario B — Electrician in English
```
"Need an electrician in DHA Lahore this Saturday, budget 3500 PKR"
Expected: electrician · DHA Lahore · Saturday · ₨3500 max
          → 3 providers ranked, booking confirmed
```

### Scenario C — Urgent Doctor
```
"Doctor zaruri hai abhi Nazimabad area mein, emergency"
Expected: urgency=emergency, nearest available clinic ranked first
```

---

## Environment Variables

Create `serviceai-backend/.env`:

```env
# Required for LLM orchestration and scraper pipeline
GROQ_API_KEY=your_groq_key

# Required for voice calling
VAPI_API_KEY=your_vapi_key
VAPI_PHONE_NUMBER_ID=your_telnyx_did_imported_into_vapi
VAPI_ASSISTANT_ID=your_vapi_assistant_id

# Optional — override default LLM model
AGENT_MODEL=llama-3.3-70b-versatile
```

The mobile app uses Firebase. Add your Firebase config to `serviceai-mobile/src/config/firebase.js`.

---

## Hackathon Context

| Field | Value |
|-------|-------|
| Competition | Google Antigravity Hackathon — Al Seekho Phase II |
| Challenge | Challenge 2 — Intelligent Service Provider Matching & Agentic Booking |
| Team size | 2–4 |
| Qualifying deadline | May 19, 2026 |
| Finals deadline | June 7, 2026 |

### Evaluation Criteria

| Criterion | Weight | How We Address It |
|-----------|:------:|-------------------|
| Use of Google Antigravity | 25% | Groq function-calling: model dynamically decides tool order and retries |
| Agentic Reasoning & Workflow | 20% | Full `tool_call_trace` streamed live to the mobile Reasoning screen |
| Matching Quality & Decision Logic | 20% | 4-factor weighted formula + LLM-generated per-provider reasoning |
| Action Simulation & Execution | 15% | Real VAPI voice calls · SQLite booking IDs · provider dashboard updates |
| Technical Implementation | 10% | Firebase Auth · clean REST API · two user roles · SSE streaming |
| Innovation & UX | 10% | Bilingual Urdu/English · real voice calls · dark design system |
