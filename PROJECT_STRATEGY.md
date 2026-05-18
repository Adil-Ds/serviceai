# 🔧 ServiceAI — Master Project Strategy
## READ THIS FIRST — Every AI Assistant Must Read This Before Writing Any Code

---

## ⚠️ MANDATORY RULE FOR ALL AI ASSISTANTS

> Before writing any code, generating any file, or making any decision:
> **Read this entire document first.**
> After every implementation session, **update EXECUTION_LOG.md** with what was built, what works, and what's next.
> These two rules are non-negotiable.

---

## 1. What We Are Building

**Project Name:** ServiceAI — Agentic Service Provider Matching & Booking System

**One-Line Description:**
A mobile-first AI system where a user describes what service they need in plain language (Urdu or English), and an agentic AI pipeline finds, ranks, books the best local provider, and automates follow-ups — with full reasoning transparency at every step.

**The Core User Experience:**
```
User: "mujhe kal Gulshan mein plumber chahiye, 2000 se zyada nahi"
  ↓
Agent 1: Parses intent → plumber, Gulshan Karachi, tomorrow, ₨2000 max
  ↓
Agent 2: Searches 50 mock providers → 3 match all filters
  ↓
Agent 3: Scores each by distance + rating + price + reviews → ranks with reasoning
  ↓
Agent 4: Books top provider → generates confirmation receipt #BK-XXXX
  ↓
Agent 5: Schedules follow-up reminders + status updates
  ↓
User sees: Ranked providers with AI reasoning + booking receipt + follow-up schedule
```

---

## 2. The Hackathon Context

**Competition:** Google Antigravity Hackathon — Al Seekho Phase II
**Challenge Selected:** Challenge 2 — Intelligent Service Provider Matching & Agentic Booking
**Qualifying Deadline:** May 19, 2026
**Finals Deadline:** June 7, 2026
**Team Size:** Small team (2–4 members)

**Why We Chose Challenge 2:**
- Relatable demo — every judge has needed a plumber, doctor, or electrician
- Achievable in 4 days from scratch with AI-assisted development
- Multi-agent pipeline maps perfectly to evaluation criteria
- Pakistani market context (local service providers in PKR) makes it specific and real
- Lower risk than Challenge 3 (CIRO), stronger impact than Challenge 1

---

## 3. Official Evaluation Criteria (Know These by Heart)

These are the exact criteria judges will use. Every feature we build must serve one of these:

| Criterion | Weight | What Judges Look For |
|---|:---:|---|
| **Use of Google Antigravity** | 25% | Antigravity must orchestrate agent workflows, not just wrap an LLM call. Show planning + execution. |
| **Agentic Reasoning & Workflow** | 20% | Multi-step reasoning visible. Logical flow from request → decision → action. Evidence of autonomy. |
| **Matching Quality & Decision Logic** | 20% | Relevant provider selection. Clear ranking criteria. Strong reasoning behind decisions shown to user. |
| **Action Simulation & Execution** | 15% | Booking process realistically simulated. Clear system state change (confirmation number, scheduling). End-to-end workflow shown. |
| **Technical Implementation** | 10% | Clean architecture. API/tool integration. Robust handling of edge cases. |
| **Innovation & UX** | 10% | Creative approach. Intuitive interface. Clear and engaging demo. |

**Critical Notes From Challenge Rules:**
- ❌ This is NOT a simple listing or booking app
- ✅ Focus on agentic automation, not UI complexity
- ✅ At least one booking must be simulated end-to-end
- ✅ Must demonstrate reasoning + decision-making
- ✅ Use mock data if real APIs are unavailable
- ✅ Mobile App is MANDATORY (first deliverable)
- 🌐 Web App is Optional (bonus)

---

## 4. Tech Stack (Decided — Do Not Change Without Discussion)

### 📱 Mobile App (Primary — MUST)
| Tool | Version | Purpose |
|---|---|---|
| React Native | Latest | Mobile framework |
| Expo | SDK 51+ | Build toolchain — zero native setup |
| Expo Go | — | Demo on real phone via QR code |
| React Navigation | v6 | Screen routing (Stack Navigator) |
| React Native Maps | Expo-compatible | Map with provider pins |
| NativeWind | v4 | Tailwind CSS syntax for React Native |

### ⚙️ Backend
| Tool | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Language |
| FastAPI | Latest | REST API framework |
| Uvicorn | Latest | ASGI server |
| SQLite | Built-in | Database for bookings + providers |
| Pydantic | v2 | Data validation |

### 🧠 AI / Agents
| Tool | Purpose |
|---|---|
| Google Gemini API (gemini-1.5-flash) | Primary LLM for all agent reasoning |
| Google Antigravity | Agent orchestration (MANDATORY per challenge rules) |
| Direct Gemini API calls | For each agent prompt (sequential pipeline) |

### 🌐 Web Dashboard (Optional — Build After Mobile)
| Tool | Purpose |
|---|---|
| React + Vite | Web frontend |
| Tailwind CSS | Styling |
| Same FastAPI backend | Shared API layer |

### 📦 Data
| Source | Format | What It Contains |
|---|---|---|
| `providers.json` | JSON file | 50 mock providers (7 categories, Karachi + Lahore) |
| `bookings.db` | SQLite | All booking records created during demo |
| Mock availability | Inline JSON | Provider schedules for next 7 days |

**Why This Stack:**
- React Native (Expo) → team knows React, 80% same concepts, Expo Go = demo-ready in 30 mins
- FastAPI → team knows Python, clean auto-docs at /docs
- Gemini Flash → fast responses, cheap, handles Urdu natively
- SQLite → zero setup, perfect for hackathon, no cloud needed
- Mock JSON data → rules explicitly allow simulated data, saves 2 days of real API integration

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ServiceAI System                         │
│                                                             │
│  📱 EXPO MOBILE APP (Primary)                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Screen 1: Home (Input)                               │  │
│  │ Screen 2: Agent Reasoning (Live animated steps)      │  │
│  │ Screen 3: Provider Results (Ranked with reasoning)   │  │
│  │ Screen 4: Booking Confirmation (Receipt)             │  │
│  │ Screen 5: Follow-Up Schedule                         │  │
│  └─────────────────────┬────────────────────────────────┘  │
│                         │ HTTP REST API                     │
│  ⚙️ FASTAPI BACKEND                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ POST /api/parse-intent      ← Agent 1                │  │
│  │ POST /api/search-providers  ← Agent 2                │  │
│  │ POST /api/rank-providers    ← Agent 3                │  │
│  │ POST /api/book              ← Agent 4                │  │
│  │ POST /api/schedule-followups← Agent 5                │  │
│  │ GET  /api/providers         ← Provider list/map      │  │
│  │ GET  /api/bookings/{id}     ← Booking lookup         │  │
│  └─────────────────────┬────────────────────────────────┘  │
│                         │                                   │
│  🧠 ANTIGRAVITY AGENT PIPELINE                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Agent 1: Intent Parser (Gemini)                     │  │
│  │  Agent 2: Provider Search (Logic + DB)               │  │
│  │  Agent 3: Ranking Engine (Formula + Gemini Reasons)  │  │
│  │  Agent 4: Booking Simulator (DB Write + Receipt Gen) │  │
│  │  Agent 5: Follow-Up Planner (Gemini)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│  💾 DATA LAYER                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  providers.json  → 50 mock providers                 │  │
│  │  bookings.db     → SQLite booking records            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. The 5 Agents — What Each Does

### Agent 1 — Intent Parser
- **Input:** Raw user text (Urdu/Roman Urdu/English)
- **Uses:** Gemini API
- **Output:** `{service_category, location, date, budget_max_pkr, urgency}`
- **Scores:** Antigravity (25%) + Agentic Reasoning (20%)

### Agent 2 — Provider Search
- **Input:** Parsed intent from Agent 1
- **Uses:** Filter logic on `providers.json`
- **Output:** Filtered list of matching providers with search summary
- **Scores:** Matching Quality (20%)

### Agent 3 — Ranking Engine
- **Input:** Filtered providers from Agent 2
- **Uses:** Scoring formula + Gemini for reasoning text
- **Formula:** Distance(35%) + Rating(35%) + Price(20%) + Reviews(10%)
- **Output:** Ranked providers with score + one-line reason each
- **Scores:** Matching Quality (20%) + Agentic Reasoning (20%)

### Agent 4 — Booking Simulator
- **Input:** Selected provider + user details
- **Uses:** SQLite write + confirmation generator
- **Output:** Booking record + receipt object with booking ID
- **Scores:** Action Simulation (15%)

### Agent 5 — Follow-Up Planner
- **Input:** Confirmed booking details
- **Uses:** Gemini API
- **Output:** 3 follow-up messages with triggers (reminder / day-of / completion)
- **Scores:** Action Simulation (15%) + Agentic Reasoning (20%)

---

## 7. Folder Structure

```
hacakathon/
├── PROJECT_STRATEGY.md          ← THIS FILE — read first always
├── EXECUTION_LOG.md             ← Updated after every session
├── Google Antigravity Hackathon - Challenges.pdf
│
├── serviceai-backend/           ← FastAPI Python backend
│   ├── main.py                  ← App entry point
│   ├── requirements.txt
│   ├── data/
│   │   ├── providers.json       ← 50 mock providers
│   │   └── bookings.db          ← SQLite database
│   └── app/
│       ├── agents/
│       │   ├── intent_agent.py  ← Agent 1
│       │   ├── search_agent.py  ← Agent 2
│       │   ├── ranking_agent.py ← Agent 3
│       │   ├── booking_agent.py ← Agent 4
│       │   └── followup_agent.py← Agent 5
│       ├── models/
│       │   └── schemas.py       ← Pydantic models
│       ├── database/
│       │   └── db.py            ← SQLite connection
│       └── api/
│           └── routes.py        ← All API endpoints
│
└── serviceai-mobile/            ← Expo React Native app
    ├── App.js                   ← Root + Navigation
    ├── app.json                 ← Expo config
    ├── package.json
    └── src/
        ├── screens/
        │   ├── HomeScreen.jsx        ← Screen 1
        │   ├── ReasoningScreen.jsx   ← Screen 2
        │   ├── ResultsScreen.jsx     ← Screen 3
        │   ├── BookingScreen.jsx     ← Screen 4
        │   └── FollowUpScreen.jsx    ← Screen 5
        ├── services/
        │   └── api.js               ← All API calls
        ├── components/
        │   ├── AgentStep.jsx         ← Animated agent step card
        │   ├── ProviderCard.jsx      ← Provider result card
        │   └── ReceiptCard.jsx       ← Booking receipt
        └── constants/
            └── theme.js             ← Colors, fonts, spacing
```

---

## 8. What We Are NOT Building (Scope Limits)

To finish in 4 days, these are explicitly out of scope:

- ❌ Real Twitter/X API integration
- ❌ Real payment processing
- ❌ Real SMS/push notifications (simulated only)
- ❌ User authentication / login
- ❌ Provider onboarding flow
- ❌ Real geolocation (hardcoded area names, not GPS)
- ❌ Error handling for edge cases beyond the happy path
- ❌ Production deployment (runs locally for demo)
- ❌ More than 3 cities (Karachi + Lahore only for providers)
- ❌ Web dashboard (build only if mobile is 100% complete)

---

## 9. Demo Scenarios (Prepare Day 1 — Practice Until Perfect)

### Scenario A — Plumber (Roman Urdu)
```
"mujhe kal Gulshan mein plumber chahiye, 2000 se zyada nahi"
Expected: 3 Gulshan plumbers ranked, Ali's Plumbing wins, booking confirmed
```

### Scenario B — Electrician (English)
```
"Need an electrician in DHA Lahore this Saturday, budget 3500 PKR"
Expected: 3 DHA Lahore electricians ranked, booking confirmed
```

### Scenario C — Doctor (Urgent)
```
"Doctor zaruri hai abhi Nazimabad area mein, emergency"
Expected: urgency=emergency, nearest available clinic ranked first
```

---

## 10. 4-Day Execution Plan

| Day | Morning | Afternoon | End-of-Day Goal |
|---|---|---|---|
| **Day 1** | Expo setup + FastAPI + providers.json | Screen 1 UI + Agent 1 connected | App opens, intent parsed from text |
| **Day 2** | Agent 2 (search) + Agent 3 (rank+reason) | Screens 2 & 3 connected to backend | Full search→rank→results flow working |
| **Day 3** | Agent 4 (booking) + Agent 5 (followups) | Screens 4 & 5 connected | Complete end-to-end flow on phone |
| **Day 4** | UI polish + animations + scenario testing | Demo video + README + submission | Submitted ✅ |

---

## 11. Key Decisions Already Made (Do Not Re-Debate)

1. **Challenge 2** is selected — not CIRO, not Content-to-Action, not the game
2. **Expo React Native** for mobile — not Flutter, not Capacitor
3. **Gemini Flash** as the LLM — not GPT-4, not local Ollama models
4. **Mock providers.json** for data — not a real API, not Google Maps Places API
5. **SQLite** for storage — not PostgreSQL, not Firebase
6. **Sequential agent pipeline** — not parallel agents (simpler, still qualifies as multi-agent)
7. **Happy path only** — no error handling beyond basic try/catch

---

## 12. What Winning Looks Like

A judge watches the demo and sees:
1. User types in Urdu → AI understands it perfectly
2. 5 agent steps animate on screen one by one
3. 3 providers appear with scores AND a plain-English reason for each rank
4. One tap → booking confirmed with a receipt number
5. Follow-up schedule appears automatically

The judge thinks: *"This is exactly what the challenge asked for, it's polished, and the AI reasoning is transparent."*

That's an 84/100 submission. That wins.

---

*Document created: May 14, 2026 | Project: ServiceAI | Challenge: 2 | Hackathon: Google Antigravity Al Seekho Phase II*
*This document is the single source of truth for this project. Update it if major decisions change.*
