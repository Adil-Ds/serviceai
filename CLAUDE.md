# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ServiceAI** — Google Antigravity Hackathon (Al Seekho Phase II, Challenge 2): Intelligent Service Provider Matching & Agentic Booking. A mobile-first system where users describe a service need in Urdu/English and a pipeline of AI agents finds, ranks, books a provider, and schedules follow-ups.

**Qualifying deadline: May 19, 2026**

## Running the Project

### Backend (FastAPI, port 8001)
```bash
cd serviceai-backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```
API docs at `http://localhost:8001/docs`. Requires `GEMINI_API_KEY` in `serviceai-backend/.env`.

### Mobile App (Expo)
```bash
cd serviceai-mobile
npx expo start          # opens Expo Dev Tools
npx expo start --web    # run in browser
```
Before running on a physical device, update `src/config/constants.js` → `BASE_URL` to your PC's local IP.

### Install dependencies
```bash
# Backend
cd serviceai-backend && pip install -r requirements.txt

# Mobile
cd serviceai-mobile && npm install --legacy-peer-deps
```

## Architecture

### Two separate apps, one backend

```
serviceai-backend/        FastAPI + SQLite + Gemini API
serviceai-mobile/         Expo React Native (iOS/Android/Web)
```

### Agent Pipeline (Sequential → being replaced with tool-calling)

The backend runs 5 agents in sequence via `POST /api/analyze`:
1. **Intent Parser** (`agents/intent_agent.py`) — Gemini extracts structured intent from raw text
2. **Provider Search** (`agents/search_agent.py`) — Pure logic filter on `data/providers.json` (50 mock providers)
3. **Ranking Engine** (`agents/ranking_agent.py`) — Haversine distance + weighted score formula, Gemini generates one-sentence reasons
4. **Booking Simulator** (`agents/booking_agent.py`) — SQLite write, generates `BK-XXXX-KHI` booking IDs
5. **Follow-Up Planner** (`agents/followup_agent.py`) — Gemini generates 3 follow-up messages

The new **agentic runner** (`agents/agentic_runner.py`) replaces the fixed pipeline with Gemini function-calling: the model decides which tools to invoke and in what order.

### Mobile Navigation Structure

```
App.js (auth-aware root)
  ├── AuthStack (when not logged in)
  │     SplashScreen → WelcomeScreen → LoginScreen / RegisterScreen
  ├── UserStack (role = 'user')
  │     UserTabs (bottom tabs) + Search flow stack overlaid
  └── ProviderStack (role = 'provider')
        ProviderTabs (bottom tabs)
```

### Data Flow

- `data/providers.json` — 50 static mock providers (source of truth for search)
- `data/bookings.db` — SQLite file, created on startup via `init_db()`
- Firebase Auth — handles login/register for both user and provider roles
- Firestore — stores user profile + role + provider's linked `provider_id`
- Backend does NOT verify Firebase tokens (hackathon simplification); role is stored client-side in AuthContext

### Key Design Decisions

- `/api/analyze` is the single endpoint the mobile app calls for the full search flow (runs agents 1–3)
- Agents 4 and 5 (`/api/book`, `/api/schedule-followups`) are called separately after user confirms booking
- Provider bookings are filtered by `provider_id` field in SQLite
- Bookings start as `PENDING` when created, change to `CONFIRMED` when provider accepts
- The `BASE_URL` in `src/config/constants.js` must match the machine running the backend

### Evaluation Criteria (know these)

| Criterion | Weight | Key for judges |
|---|:---:|---|
| Use of Google Antigravity | 25% | Agent orchestrates tool calls dynamically via Gemini function-calling |
| Agentic Reasoning & Workflow | 20% | Show agent's tool call trace + reasoning on screen |
| Matching Quality & Decision Logic | 20% | Scoring formula + AI reasons per provider |
| Action Simulation & Execution | 15% | Booking ID generated, SQLite persisted, provider dashboard updates |
| Technical Implementation | 10% | Firebase auth, clean API, two dashboards |
| Innovation & UX | 10% | Dark design system, animations, bilingual support |
