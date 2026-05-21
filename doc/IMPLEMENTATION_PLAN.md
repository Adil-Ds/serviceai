# ServiceAI — Full Implementation Plan
**Created: May 16, 2026 | Senior Dev Review**

---

## Deep Analysis: What Judges Need To See

Based on Challenge 2 criteria:

| Criterion | What We Must Show | Implementation |
|---|---|---|
| **Antigravity (25%)** | Gemini orchestrates tool calls dynamically — NOT a fixed script | Tool-calling agent loop in `agentic_runner.py` |
| **Agentic Reasoning (20%)** | Agent's thought process visible step-by-step | ReasoningScreen shows tool calls + Gemini's reasoning text |
| **Matching Quality (20%)** | Clear scoring formula + why each provider ranked where it did | Score breakdown card + AI sentence per provider |
| **Action Simulation (15%)** | Booking creates DB record, provider dashboard updates live | PENDING → CONFIRMED status flow with provider dashboard |
| **Technical (10%)** | Firebase auth, two user types, clean REST API | Dual role auth + dashboards |
| **Innovation/UX (10%)** | Something memorable — not just a list app | Dark glassmorphism design, Urdu support, dual dashboards |

---

## Architecture Overview

```
Firebase Auth + Firestore
       │ role: 'user' | 'provider'
       │ linkedProviderId (for providers)
       ▼
📱 Expo React Native App
  AuthStack → UserTabs / ProviderTabs → Search Flow (modal stack)
       │
       │ HTTP (with Firebase UID in header)
       ▼
⚙️ FastAPI Backend (port 8001)
  Agentic Runner (Gemini tool-calling loop)
  ├── Tool: search_providers()  → providers.json filter
  ├── Tool: rank_providers()    → score formula + Gemini reasons
  ├── Tool: create_booking()    → SQLite write (status=PENDING)
  └── Tool: schedule_followup() → Gemini 3 messages
       │
💾 SQLite (bookings.db) + providers.json
```

---

## Phase 1: Foundation Setup
**Files: package.json, firebase config, auth context, theme**

### 1.1 Add npm packages
```json
"firebase": "^10.14.0",
"@react-native-async-storage/async-storage": "^2.0.0",
"expo-linear-gradient": "~13.0.2",
"@react-navigation/bottom-tabs": "^7.x"
```

### 1.2 Firebase project setup
- Enable Email/Password auth in Firebase Console
- Create Firestore database
- Copy web config to `src/config/firebase.js`
- User document: `{ uid, name, email, role, createdAt }`
- Provider document: `{ uid, name, email, role, category, city, area, phone, linkedProviderId }`

### 1.3 AuthContext
- Wraps entire app
- Exposes: `{ user, userProfile, loading, signIn, signUp, signOut }`
- Fetches Firestore profile after sign-in to get role

---

## Phase 2: Auth Screens (4 screens)
**Goal: Beautiful role-based login flow**

### SplashScreen
- Animated logo on gradient background
- Auto-navigates after 2s

### WelcomeScreen
- Two big role cards: "I need a service" vs "I provide services"
- Leads to Login or Register with role pre-selected

### LoginScreen
- Email + password
- Google sign-in (optional)
- Link to Register

### RegisterScreen
- Role-specific fields:
  - User: name, email, password
  - Provider: name, email, password, phone, service category, city, area

---

## Phase 3: User Dashboard + Search Flow
**Goal: Impressive user experience end-to-end**

### UserDashboard (Tab 1 — Home)
- Greeting (time-based: "Good morning, Ahmed!")
- Stats row: "X bookings completed"
- Quick categories (6 icons)
- Recent bookings preview card
- "Find a Service" CTA button → SearchScreen

### SearchScreen
- Natural language input (large, prominent)
- Suggested searches for demo scenarios
- Urdu keyboard hint

### ReasoningScreen (ENHANCED)
- Shows Gemini's tool call trace, not fixed 5 steps
- Each tool call appears with typing animation
- Shows: tool name, arguments, result summary
- Gemini's reasoning text between tool calls

### ResultsScreen (ENHANCED)
- Cleaner provider cards with glassmorphism
- Expanded score breakdown (tap to see distance/rating/price breakdown)
- "Best Match" badge on #1

### BookingScreen (ENHANCED)
- Provider mini-profile at top
- Slot selector with visual calendar feel
- Address input with suggestions
- Price breakdown card

### ConfirmationScreen (ENHANCED)
- Success animation (confetti-like)
- Booking ID QR-style display
- Follow-up timeline card
- "View Booking" → BookingHistory

### BookingHistoryScreen (Tab 2 — Bookings)
- List of all user bookings from backend
- Status badges: PENDING (yellow), CONFIRMED (green), CANCELLED (red)
- Tap to see full receipt

---

## Phase 4: Provider Dashboard
**Goal: Providers can manage bookings = completes the full workflow**

### ProviderDashboard (Tab 1)
- Header: provider name + category badge
- Stats cards: Total bookings, Total earnings (PKR), Average rating
- "Pending Requests" section (urgent, with count badge)
- "Upcoming" section (confirmed bookings)

### BookingRequestsScreen (Tab 2)
- List of PENDING bookings for this provider
- Accept / Decline buttons per request
- PUT /api/bookings/{id}/status → 'CONFIRMED' or 'CANCELLED'
- Pull-to-refresh

### ProviderProfileScreen (Tab 3)
- View + edit profile fields
- Availability toggle (days)
- Rating display (read-only)

---

## Phase 5: Backend — Agentic Runner
**Goal: Replace fixed pipeline with Gemini tool-calling (most important for judges)**

### New: `agentic_runner.py`
```
User text → Gemini (with tools defined)
  Gemini calls: search_providers(...)  → we execute → return results
  Gemini calls: rank_providers(...)    → we execute → return results
  Gemini returns: text with reasoning + final recommendations
Agent trace returned to frontend: [{tool, args, result, reasoning}]
```

### Updated `routes.py`
- `POST /api/analyze` → now uses agentic_runner instead of fixed pipeline
- `GET /api/provider/bookings` → filtered by provider_id + status
- `GET /api/user/bookings` → filtered by user_id (Firebase UID)
- `PUT /api/bookings/{id}/status` → provider accepts/declines
- `GET /api/provider/stats` → earnings + booking count

### Updated `db.py`
- `get_bookings_by_provider(provider_id, status=None)`
- `get_bookings_by_user(user_id)`
- `update_booking_status(booking_id, status)`
- `insert_booking()` — add `user_id` and `status=PENDING` fields

---

## File Change Summary

### New files (mobile):
- `src/config/firebase.js`
- `src/config/constants.js`
- `src/contexts/AuthContext.js`
- `src/screens/auth/SplashScreen.jsx`
- `src/screens/auth/WelcomeScreen.jsx`
- `src/screens/auth/LoginScreen.jsx`
- `src/screens/auth/RegisterScreen.jsx`
- `src/screens/user/UserDashboard.jsx`
- `src/screens/user/SearchScreen.jsx`
- `src/screens/user/BookingHistoryScreen.jsx`
- `src/screens/provider/ProviderDashboard.jsx`
- `src/screens/provider/BookingRequestsScreen.jsx`
- `src/screens/provider/ProviderProfileScreen.jsx`

### Updated files (mobile):
- `App.js` — full rewrite with auth-aware navigation + tabs
- `package.json` — add Firebase, async-storage, linear-gradient, bottom-tabs
- `src/constants/theme.js` — expanded design system
- `src/screens/user/ReasoningScreen.jsx` — shows tool-call trace
- `src/screens/user/ResultsScreen.jsx` — glassmorphism cards (moved to user/)
- `src/screens/user/BookingScreen.jsx` — enhanced (moved to user/)
- `src/screens/user/ConfirmationScreen.jsx` — new name for FollowUpScreen (moved to user/)
- `src/services/api.js` — add auth header, new endpoints

### New files (backend):
- `app/agents/agentic_runner.py`

### Updated files (backend):
- `app/api/routes.py` — add provider/user endpoints
- `app/database/db.py` — add queries
- `requirements.txt` — add firebase-admin (optional)
- `main.py` — minor: fix deprecation warning

---

## Execution Order

1. ✅ CLAUDE.md + IMPLEMENTATION_PLAN.md (this file)
2. ⬜ Phase 1: package.json + config + theme + AuthContext
3. ⬜ Phase 2: Auth screens (Splash, Welcome, Login, Register) + App.js
4. ⬜ Phase 3: User dashboard + search flow screens
5. ⬜ Phase 4: Provider dashboard screens
6. ⬜ Phase 5: Backend agentic runner + new endpoints
7. ⬜ Phase 6: Integration testing + demo scenarios

After each phase, update this document's checkboxes.

---

*Plan created: May 16, 2026 | Challenge 2 | Google Antigravity Hackathon*
