# ServiceAI — Development Session Log
**Date:** 2026-05-17  
**Project:** ServiceAI — Google Antigravity Hackathon (Al Seekho Phase II, Challenge 2)  
**Deadline:** 2026-05-19

---

## Session Summary

Full development session covering backend AI pipeline, frontend UI, connectivity fixes, and performance optimisation.

---

## 1. Web Results Display (Frontend)

### ReasoningScreen.jsx
- Added `webResults` state initialised from `result?.web_results || []`
- Added `search_web_providers` to `STEP_COLORS` and `STEP_DESC` dictionaries:
  - Color: `COLORS.info` (blue)
  - Description: "Searching the web for nearby businesses"
- In SSE complete handler: `setWebResults(data.web_results || [])`
- CTA condition updated: `ranked.length > 0 || webResults.length > 0`
- Web-results-only success card shows globe icon and "View N Web Results" button
- Navigation passes `webResults` to ResultsScreen

### ResultsScreen.jsx
- Added `Linking` import for phone/URL taps
- Destructures `webResults = []` from `route.params`
- Added `WebResultCard` component:
  - Animated entrance (fadeAnim + slideAnim)
  - Shows: name, "Web Search Result" badge, description (4 lines max)
  - Phone button → `Linking.openURL("tel:...")`
  - URL button → `Linking.openURL(url)`
- Header changes to "🌐 Web Results" when `ranked.length === 0`
- Disclaimer card: "These are external listings. Call or visit directly..."

---

## 2. Switch from Demo Mode to Real Agent Mode

### Changes made:
- `constants.js`: Set `DEMO_MODE = false`
- `constants.js`: Increased `ANALYZE_TIMEOUT_MS` from 15000 → 60000 (Groq pipeline takes 8-20s)
- Removed all "Gemini" references from UI strings — replaced with "Groq / Llama" or model-neutral language
- `SearchScreen.jsx`: Updated SUGGESTIONS to include non-DB categories (cleaner, painter, mechanic) so web search fallback is demonstrated
- Provider screens: Wired to show only real bookings from SQLite for logged-in provider's `provider_id`

---

## 3. Dark/Light Theme System

### New file: `src/contexts/ThemeContext.js`
- DARK palette = existing `COLORS` constants
- LIGHT palette with appropriate light-mode colours
- `ThemeProvider` reads `@serviceai_appearance` from AsyncStorage on mount
- `setTheme()` updates state + persists to AsyncStorage
- Resolves `'auto'` via `useColorScheme()`
- Exports: `{ theme, isDark, colors, navTheme, setTheme }`

### App.js changes:
- Wrapped root with `<ThemeProvider><AuthProvider><ThemedApp /></AuthProvider></ThemeProvider>`
- Created `ThemedApp` inner component so `useTheme()` can be called inside `ThemeProvider`
- `NavigationContainer theme={navTheme}` wires theme to React Navigation
- `CustomTabBar` uses `useTheme()` for background and tab colours
- `StatusBar` style switches between `"light"` and `"dark"` dynamically

### AppearanceScreen.jsx:
- Wired to `useTheme()` context
- Theme selection now applies instantly without app restart
- Updated note: "Theme changes apply instantly"

---

## 4. WelcomeScreen Redesign (Complete Rewrite)

Design direction: Linear / Perplexity / Raycast / Stripe aesthetic. Dark purple branding.

### Key components added:
- **`PulseDot`**: Expanding ring animation (scale 1→2.6, opacity 0.85→0, 1100ms loop)
- **`FeaturePill`**: Spring scale 0→1 entrance per pill
- **`RoleCard`**: 
  - `cardShell` (outer Animated.View): coloured drop shadow (`shadowColor: accent, shadowOpacity: 0.28`)
  - `card` (inner View): `overflow: "hidden"` clips gradient layers
  - Linear gradient bloom inside card
  - Press glow: animated opacity 0→1 on pressIn
  - Badge with animated dot + "Popular" label
  - Footer metric + arrow button

### Background effects:
- Two ambient blobs (indigo + amber) with breathing animations
- `logoMark` with purple glow (`shadowColor: "#6C63FF"`)
- `livePill` with PulseDot + "AI Online" text
- Eyebrow text flanked by `height:1` gradient lines
- Headline: `fontSize 40`, `letterSpacing -1.0`, `lineHeight 48`

---

## 5. Backend — Groq Migration

### agentic_runner.py:
- Replaced Gemini client with `AsyncGroq`
- Model: `llama-3.3-70b-versatile` (via `GROQ_API_KEY` env var)
- `RunContext` dataclass tracks: user coords, parsed intent, search result, ranked providers, web results, tool trace
- 5-tool agentic loop: parse_intent → search_providers → rank_providers → search_web_providers → ask_clarification

### tools.py:
- 5 registered tools in OpenAI-compatible function-calling format
- `TOOL_DISPLAY_META` for display names + Ionicons icon names
- `dispatch_tool()` routes to correct executor

### web_search_agent.py:
- `_sync_ddg_search()` using DuckDuckGo (runs in `asyncio.to_thread()`)
- `_extract_phone()` with 3 Pakistani phone number regex patterns
- Returns up to 5 results with name, description, phone, URL

### schemas.py:
- `AgentRunResult` includes `web_results: Optional[List[Dict]]`
- Default model field: `"llama-3.3-70b-versatile"`

---

## 6. Performance Optimisation — Reduced Groq API Calls

**Problem:** Pipeline was making 8 Groq API calls per request → 15-25 second response time.

| Component | Before | After |
|---|---|---|
| `generate_reason()` in ranking_agent | 3 sequential Groq calls | Pure Python — instant |
| `parse_intent()` in intent_agent | 1 extra Groq call | Keyword fallback — instant |
| Agentic loop iterations | 4 Groq calls | 4 Groq calls (minimum needed) |
| **Total** | **8 Groq calls** | **4-5 Groq calls** |

**Result:** Response time dropped from 15-25s → 5-10s.

### ranking_agent.py — generate_reason() rewritten as pure Python:
```python
def generate_reason(provider, rank, breakdown, intent) -> str:
    dist   = breakdown["distance_km"]
    badge  = "Verified · " if provider.verified else ""
    if rank == 1:
        if dist <= 2.0:
            return f"{badge}Closest at {dist} km with a strong {provider.rating}/5 rating."
        return f"{badge}Highest composite score — {provider.rating}/5 rating, ₨{provider.price_min:,} starting price."
    if rank == 2:
        return f"{badge}{provider.rating}/5 rated, {dist} km away, priced from ₨{provider.price_min:,}."
    return f"{badge}Reliable choice — {provider.review_count} reviews, {dist} km, ₨{provider.price_min:,}."
```

---

## 7. Bug Fixes

### Pydantic v2 Deprecation — `.dict()` → `.model_dump()`
Fixed in 5 places:
- `agentic_runner.py` (×2) — tool_call_trace serialisation
- `tools.py` (×2) — parsed_intent and ranked_providers
- `routes.py` (×1) — rank-providers endpoint

### DuckDuckGo Package Renamed
- Old: `from duckduckgo_search import DDGS` → gave RuntimeWarning, returned 0 results
- Fixed: `from ddgs import DDGS` with fallback to old package name
- Install: `pip install ddgs`

### Location Permissions Not Requested
- `app.json` was missing `expo-location` plugin declaration
- Added Android permissions: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- Added iOS `NSLocationWhenInUseUsageDescription`
- Added `plugins: [["expo-location", {...}]]` block

---

## 8. Expo Mobile Connectivity

**Problem:** Expo Go on phone could not connect to Metro bundler on same WiFi.

**Diagnosis:**
- PC Wi-Fi IP: `192.168.100.78` ✓ (matches `LAN_IP` in constants.js)
- Metro port 8081: LISTENING on `0.0.0.0` ✓
- FastAPI port 8001: LISTENING on `0.0.0.0` ✓
- Windows Firewall: Active profile = **Public** — blocks inbound from other devices
- Root cause: Windows set the WiFi ("DING DONG 3") to **Public** profile by default

**Fix:** Windows Settings → Network & Internet → Wi-Fi → "DING DONG 3" → Network profile type → **Private**

**Alternative (ngrok tunnel) also set up in `constants.js`:**
```js
const NGROK_URL = "";  // paste ngrok URL here if AP isolation is active
export const BASE_URL = NGROK_URL
  ? NGROK_URL
  : Platform.OS === "web" ? "http://localhost:8001" : `http://${LAN_IP}:8001`;
```

---

## 9. Metro Bundler Cache Issue

**Problem:** Frontend changes (Groq model name, web search step, dark/light theme) not appearing after restart.

**Fix:** Always run with `--clear` flag:
```bash
npx expo start --clear
```

Plain `npx expo start` serves the old compiled bundle from cache.

---

## 10. Current Architecture State

```
serviceai-backend/
  main.py                          FastAPI app entry point
  app/
    agents/
      agentic_runner.py            Groq function-calling orchestration loop
      tools.py                     5 tool definitions + dispatcher
      intent_agent.py              Keyword-based intent extraction (fast, no LLM call)
      search_agent.py              Pure Python filter on providers.json
      ranking_agent.py             Haversine scoring + pure Python reasons
      web_search_agent.py          DuckDuckGo fallback (ddgs package)
      booking_agent.py             SQLite booking writer
      followup_agent.py            Groq follow-up message generator
    api/
      routes.py                    FastAPI route handlers
      streaming.py                 SSE endpoint (/api/analyze/stream)
    models/
      schemas.py                   Pydantic v2 models
    database/
      db.py                        SQLite helpers

serviceai-mobile/
  App.js                           ThemeProvider + AuthProvider root
  app.json                         Expo config (location permissions added)
  src/
    config/constants.js            BASE_URL, DEMO_MODE=false, ANALYZE_TIMEOUT_MS=60000
    contexts/
      ThemeContext.js              Dark/light theme with AsyncStorage persistence
    screens/
      auth/
        WelcomeScreen.jsx          Redesigned landing screen
      user/
        SearchScreen.jsx           AI query input + agent pipeline visual
        ReasoningScreen.jsx        SSE/POST result + live agent step display
        ResultsScreen.jsx          Provider cards + WebResultCard for web results
        AppearanceScreen.jsx       Live theme switching
```

---

## 11. Environment

- **Backend:** Python, FastAPI, Groq API (`llama-3.3-70b-versatile`), SQLite, DuckDuckGo (`ddgs`)
- **Mobile:** Expo SDK, React Native, Firebase Auth, Firestore
- **PC IP:** 192.168.100.78
- **Backend port:** 8001
- **Metro port:** 8081

### Run commands:
```bash
# Backend
cd serviceai-backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Mobile
cd serviceai-mobile
npx expo start --clear
```

---

## 12. Remaining Before Demo (Deadline: 2026-05-19)

- [ ] Install `ddgs` on backend: `pip install ddgs`
- [ ] Confirm web search returns real results end-to-end on device
- [ ] Confirm location permission dialog appears on fresh Expo Go install
- [ ] Test full booking flow: Search → Reasoning → Results → Book → Provider dashboard
- [ ] Verify provider dashboard shows only own bookings (no dummy data)
- [ ] Run `npx expo start --clear` after any frontend change
