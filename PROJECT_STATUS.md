# ServiceAI — Project Status Report
**As of May 16, 2026 | Reviewed by Senior Developer**

---

## What We Are Building

**ServiceAI** — A mobile-first, AI-powered service provider matching and booking system for Pakistani users.

A user describes what they need in plain language (Urdu, Roman Urdu, or English), and a pipeline of 5 AI agents automatically finds, ranks, books the best local provider, and schedules follow-up reminders — with every reasoning step shown to the user.

**Hackathon:** Google Antigravity — Al Seekho Phase II (Challenge 2)
**Qualifying Deadline:** May 19, 2026

---

## Overall Status: COMPLETE (Core System)

The full end-to-end system is built and functional. Both the backend and mobile app are connected and working. The system only needs to be run, demoed, and submitted.

---

## What Has Been Built

### 1. Backend — FastAPI (Python)
**Location:** `serviceai-backend/`
**Status:** Complete and functional

| File | What It Does | Status |
|---|---|:---:|
| `main.py` | App entry point, CORS, startup hook, root/health endpoints | ✅ Done |
| `requirements.txt` | Dependencies: FastAPI, Uvicorn, google-genai, Pydantic, dotenv | ✅ Done |
| `.env` | Holds the `GEMINI_API_KEY` | ✅ Done |
| `app/models/schemas.py` | All Pydantic data models (ServiceRequest, ParsedIntent, Provider, RankedProvider, BookingRequest, BookingConfirmation, FollowUp, FollowUpSchedule, SearchResult) | ✅ Done |
| `app/database/db.py` | SQLite connection, table creation, insert/fetch booking functions | ✅ Done |
| `data/providers.json` | 50 mock service providers across Karachi and Lahore | ✅ Done |
| `data/bookings.db` | SQLite database file (auto-created on first run) | ✅ Done |

**API Endpoints built:**

| Endpoint | Agent | Purpose |
|---|:---:|---|
| `POST /api/parse-intent` | 1 | Parse raw user text into structured intent |
| `POST /api/search-providers` | 2 | Filter providers by category, area, date, budget |
| `POST /api/rank-providers` | 3 | Score and rank filtered providers with AI reasoning |
| `POST /api/book` | 4 | Create a confirmed booking in SQLite |
| `POST /api/schedule-followups` | 5 | Generate 3 AI follow-up messages |
| `POST /api/analyze` | 1+2+3 | Full pipeline in a single call (used by mobile) |
| `GET /api/providers` | — | Return all 50 providers |
| `GET /api/bookings/{id}` | — | Fetch a specific booking by ID |
| `GET /api/bookings` | — | List all bookings |
| `GET /health` | — | Health check |

---

### 2. The 5 AI Agents

**All agents use `gemini-flash-latest` via the `google-genai` SDK.**

#### Agent 1 — Intent Parser (`intent_agent.py`)
- Sends raw user text to Gemini with a structured prompt.
- Extracts: `service_category`, `location`, `city`, `area`, `date`, `budget_max_pkr`, `urgency`, `special_requirements`.
- Handles Urdu (`kal` = tomorrow, `aaj` = today, `zaruri/abhi` = emergency), Roman Urdu, and English.
- Normalizes area names (e.g. "gulshan" → "Gulshan-e-Iqbal", Karachi).
- Falls back to a default category if Gemini returns something unexpected.
- **Status: Complete**

#### Agent 2 — Provider Search (`search_agent.py`)
- Pure logic — no LLM call. Fast and reliable.
- Filters `providers.json` in 4 steps: category → city+area match → availability on requested day → budget.
- Fallback: if no budget match, shows all city-level matches (up to 5).
- Returns a human-readable `search_summary` string.
- **Status: Complete**

#### Agent 3 — Ranking Engine (`ranking_agent.py`)
- Computes a score for each provider using a weighted formula:
  - Distance 35% (Haversine distance from user's area center coords)
  - Rating 35%
  - Price fit 20%
  - Review count 10%
- Sorts providers, takes top 3.
- Calls Gemini once per provider to generate a one-sentence plain-English reason for its rank.
- **Status: Complete**

#### Agent 4 — Booking Simulator (`booking_agent.py`)
- Generates a booking ID in format `BK-XXXX-KHI`.
- Writes the booking record to SQLite.
- Returns a full `BookingConfirmation` object.
- No LLM call — pure logic.
- **Status: Complete**

#### Agent 5 — Follow-Up Planner (`followup_agent.py`)
- Calls Gemini with full booking details.
- Generates exactly 3 follow-up messages:
  1. SMS reminder — 1 day before
  2. Push notification — 2 hours before service
  3. In-App message — 30 minutes after completion
- **Status: Complete**

---

### 3. Mock Data — providers.json
- **50 providers** across 6 service categories and 2 cities.
- Categories: `plumber`, `electrician`, `doctor`, `tutor`, `ac_technician`, `carpenter`
- Cities: Karachi (areas: Gulshan-e-Iqbal, DHA, Nazimabad, Clifton, North Karachi) and Lahore (areas: DHA Lahore, Gulberg, Model Town, Johar Town)
- Each provider has: id, name, category, city, area, lat/lng, rating, review_count, price_min, price_max, available_days, phone, experience_years, verified flag.
- **Status: Complete**

---

### 4. Mobile App — React Native (Expo)
**Location:** `serviceai-mobile/`
**Status:** Complete and connected to backend

| Screen | File | What It Does | Status |
|---|---|---|:---:|
| Screen 1 — Home | `HomeScreen.jsx` | Text input for user request + quick-select category buttons (6 icons) + "Find Providers" button | ✅ Done |
| Screen 2 — Reasoning | `ReasoningScreen.jsx` | Animated display of 3 agent steps appearing one-by-one (900ms intervals). Shows parsed intent card (service, location, date, budget, urgency badge). | ✅ Done |
| Screen 3 — Results | `ResultsScreen.jsx` | Ranked provider cards showing: rank badge (gold/silver/bronze), name, area, rating, distance, price, match score bar, AI reasoning quote, "Book This Provider" button | ✅ Done |
| Screen 4 — Booking | `BookingScreen.jsx` | Provider summary, date display, time slot selector (4 slots), address input, price display, "Confirm Booking" button | ✅ Done |
| Screen 5 — Follow-Up | `FollowUpScreen.jsx` | Success banner + booking ID, full receipt table, 3 AI-generated follow-up cards with channel icons and color-coded triggers, "Book Another Service" button | ✅ Done |

**Supporting files:**

| File | Purpose | Status |
|---|---|:---:|
| `App.js` | Navigation setup with Stack Navigator, dark header theme | ✅ Done |
| `src/services/api.js` | All API calls to backend — analyze, book, scheduleFollowups, getProviders, etc. | ✅ Done |
| `src/constants/theme.js` | Dark color palette (COLORS), font weights (FONTS), border radii (RADIUS), CATEGORIES array | ✅ Done |

**Package dependencies:**
- `expo ~54.0.33`, `react 19.1.0`, `react-native 0.81.5`
- `@react-navigation/native ^7.2.4`, `@react-navigation/native-stack ^7.15.1`
- `react-native-screens`, `react-native-safe-area-context`, `react-native-web`

---

## The User Flow (End-to-End)

```
HomeScreen
  User types: "mujhe kal Gulshan mein plumber chahiye, 2000 se zyada nahi"
  Taps: "Find Providers"
  → Calls POST /api/analyze (runs Agents 1 + 2 + 3 in one shot)
       ↓
ReasoningScreen
  Shows 3 animated agent steps appearing one by one
  Shows parsed intent: service=plumber, area=Gulshan-e-Iqbal, date=tomorrow, budget=₨2000
       ↓
ResultsScreen
  Shows top 3 ranked providers with scores and AI reasoning per provider
  User taps: "Book This Provider"
       ↓
BookingScreen
  User selects a time slot, enters their address
  Taps: "Confirm Booking"
  → Calls POST /api/book (Agent 4) → SQLite write, booking ID generated
  → Calls POST /api/schedule-followups (Agent 5) → 3 follow-up messages
       ↓
FollowUpScreen
  Shows booking confirmed + booking ID (e.g. BK-A1B2-KHI)
  Shows receipt table
  Shows 3 follow-up messages scheduled by Agent 5
  Taps: "Book Another Service" → back to Home
```

---

## What Is NOT Built (Out of Scope — By Design)

- No real user authentication or login
- No real payment processing
- No real SMS/push notifications (simulated only)
- No real GPS geolocation (area names used, not coordinates)
- No web dashboard (only mobile)
- No Google Maps or real Places API
- No production deployment (runs locally)
- No error handling beyond basic try/catch and alerts

---

## What Still Needs To Be Done

| Task | Priority | Notes |
|---|:---:|---|
| Record demo video | 🔴 HIGH | Required for submission |
| Write README.md | 🔴 HIGH | Required for submission |
| Test all 3 demo scenarios on a real device | 🔴 HIGH | Run Expo Go app on phone via QR code |
| Update `api.js` BASE_URL to correct local IP | 🟡 MED | Currently hardcoded to `10.105.205.210:8001` — must match the PC running the backend |
| Fix the `.env` exposure | 🟡 MED | API key is hardcoded in plaintext `.env` — OK for hackathon, not for public repo |
| Test edge case: no providers found | 🟢 LOW | UI already handles this with a fallback message |
| Add `@on_event("startup")` deprecation fix | 🟢 LOW | FastAPI deprecated `@on_event` — minor warning, doesn't break anything |

---

## How to Run Right Now

### Step 1 — Start the backend
```bash
cd serviceai-backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Step 2 — Start the mobile app
```bash
cd serviceai-mobile
npx expo start
```
- Scan QR code with Expo Go on your phone, OR press `w` to open in browser.
- **Important:** Update `src/services/api.js` line 6 (`BASE_URL`) to your PC's local IP address.

### Step 3 — Demo scenario (test this first)
```
Type: "mujhe kal Gulshan mein plumber chahiye, 2000 se zyada nahi"
Expected result: 3 Gulshan plumbers ranked, Ali's Plumbing at #1, booking confirmed
```

---

## Architecture Diagram

```
📱 EXPO MOBILE APP
  HomeScreen → ReasoningScreen → ResultsScreen → BookingScreen → FollowUpScreen
       │                                                │               │
       │ POST /api/analyze                POST /api/book     POST /api/schedule-followups
       ▼                                                ▼               ▼
⚙️ FASTAPI BACKEND (port 8001)
  Agent 1: Intent Parser   → Gemini API (parse Urdu/English text)
  Agent 2: Provider Search → providers.json filter logic
  Agent 3: Ranking Engine  → Score formula + Gemini API (reasoning)
  Agent 4: Booking Sim     → SQLite write → booking ID
  Agent 5: Follow-Up       → Gemini API (3 messages)
       │
💾 DATA LAYER
  providers.json (50 providers) + bookings.db (SQLite)
```

---

*Document generated: May 16, 2026 | Project: ServiceAI | Google Antigravity Hackathon Phase II*
