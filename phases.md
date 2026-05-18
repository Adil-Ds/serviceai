---
  PHASE B — Gemini Function-Calling Loop

  Time: 2 hours | Part of Phase A, detailed here

  Objective: The loop must handle real multi-turn conversation with Gemini. 

  Critical implementation details:
  - MAX_ITERATIONS = 8 (safety cap to prevent infinite loops)
  - Each iteration: generate → check part type → execute if function_call → 
  feed back → repeat if text
  - Handle finish_reason: STOP (normal completion) vs MAX_TOKENS (truncation
   error)
  - Handle finish_reason: SAFETY — return safe fallback message

  The system prompt matters enormously. Write it carefully:
  You are ServiceAI's autonomous agent. Your job is to help Pakistani users 
  book local services.

  Available tools: parse_intent, search_providers, rank_providers,
  ask_clarification.

  Workflow:
  1. Call parse_intent to understand the request
  2. Call search_providers with the parsed parameters
  3. If search returns 0 results, call search_providers again without area  
  (city-wide)
  4. Call rank_providers with the found providers
  5. Produce a final 2-3 sentence summary in English explaining what you    
  found

  If the service type is unclear, call ask_clarification instead of
  guessing.
  Always be specific. Always mention the top provider's name and score.     

  This prompt makes the retry behavior (step 3) automatic without any Python
   retry code.

  ---
  PHASE C — Tool Registration System

  Time: 1 hour | Part of Phase A

  Objective: Define all FunctionDeclarations correctly.

  Files to create: app/agents/tools.py

  Content: FunctionDeclaration for each tool, TOOL_REGISTRY dict mapping    
  name → Python function, REGISTERED_TOOLS list passed to Gemini config.    

  Critical detail: Gemini's function args come as a MapComposite object, not
   a plain dict. Always call dict(part.function_call.args) before passing to
   your Python functions.

  ---
  PHASE D — Real Reasoning Traces

  Time: 1 hour | Depends on Phase A

  Objective: Update the API response schema and the frontend to use real    
  trace data.

  Files to modify:
  - app/models/schemas.py — add ToolCallStep, AgentRunResult Pydantic models
  - app/api/routes.py — return AgentRunResult from /api/analyze

  Frontend tasks:
  - Update src/services/api.js — the analyze() call parses tool_call_trace  
  from response
  - Update src/screens/user/ReasoningScreen.jsx — receive trace in route    
  params, render real data
  - Each AgentCard reads its data from trace[i] instead of AGENT_META[i]    
  - Real result_summary replaces the hardcoded description text
  - Real duration_ms drives TypewriterText delay

  Expected output: ReasoningScreen shows real tool names, real result       
  summaries, real timing. TypewriterText displays the actual result_summary 
  from the API. No hardcoded strings anywhere.

  ---
  PHASE E — Live Event Streaming

  Time: 3 hours | Depends on Phase A + B

  Objective: SSE endpoint that streams agent events as they happen.

  Files to create: app/api/streaming.py

  Backend tasks:
  1. Create GET /api/analyze/stream endpoint using StreamingResponse        
  2. Modify run_agentic_loop to accept on_event: Callable callback
  3. Callback await on_event(event_type, data) called before and after each 
  tool execution
  4. SSE format: event: {type}\ndata: {json}\n\n
  5. Register the streaming router in main.py

  Frontend tasks (do after confirming backend SSE works in browser):        
  1. Install or implement EventSource for React Native (or use fetch with   
  stream reading)
  2. ReasoningScreen subscribes to SSE URL on mount
  3. Each agent_start event transitions card to "active"
  4. Each agent_done event transitions card to "done" with real summary     
  5. complete event triggers navigation to ResultsScreen with full payload  

  Testing tasks:
  - Test SSE in browser: navigate to
  http://localhost:8001/api/analyze/stream?q=plumber+DHA
  - Verify events arrive one by one with correct timing
  - Verify complete event carries full ranked provider list

  Dependency: Phase A must be complete and working.

  ---
  PHASE F — Provider Matching Redesign

  Time: 2 hours | Depends on Phase A

  Objective: Real GPS coordinates from device, real slot availability check.

  Files to modify:
  - app/agents/search_agent.py — accept user coordinates as input
  - app/agents/ranking_agent.py — use real coordinates instead of area      
  centroid
  - app/database/db.py — add get_booked_slots(provider_id, date) function,  
  add unique index

  Frontend tasks:
  1. In SearchScreen.jsx: call Expo.Location.getCurrentPositionAsync()      
  before submitting
  2. Include user_lat, user_lng in the POST body to /api/analyze
  3. In BookingScreen.jsx: gray out slots that appear in booked_slots from  
  provider data

  Gemini FunctionDeclaration update: Add user_lat: float, user_lng: float to
   rank_providers schema.

  ---
  PHASE G — Booking Lifecycle Redesign

  Time: 1 hour | Quick wins

  Objective: Fix the PENDING/CONFIRMED default conflict, add slot conflict  
  prevention.

  Files to modify:
  - app/database/db.py — fix DEFAULT to 'PENDING', add unique index, add    
  get_booked_slots()
  - app/agents/booking_agent.py — handle IntegrityError for double-booking  

  Backend tasks:
  1. Fix DEFAULT 'CONFIRMED' → DEFAULT 'PENDING' in CREATE TABLE (and in    
  init_db)
  2. Add CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_slot ON
  bookings(provider_id, date, time_slot) WHERE status != 'CANCELLED'        
  3. Wrap insert_booking in try/except sqlite3.IntegrityError

  ---
  PHASE H — Follow-Up Automation

  Time: 1 hour | Completes the booking lifecycle

  Objective: Persist follow-ups in SQLite, serve them via API.

  Files to modify:
  - app/database/db.py — add follow_ups table, insert_followups(),
  get_followups(booking_id)
  - app/agents/followup_agent.py — after generating, call insert_followups()
  - app/api/routes.py — add GET /api/followups/{booking_id}

  Frontend tasks:
  - ConfirmationScreen.jsx: fetch GET /api/followups/{booking_id} after     
  booking confirmation
  - Render real follow-up messages from database (not just from API
  response)

  ---
  PHASE I — Frontend Synchronization

  Time: 3 hours | Depends on Phase D

  Objective: ReasoningScreen renders real trace data. Navigation is
  synchronized with real API timing.

  Files to modify:
  - src/screens/user/SearchScreen.jsx — loading state while API call runs   
  - src/screens/user/ReasoningScreen.jsx — render from real trace, not fake 
  timers
  - src/screens/user/ResultsScreen.jsx — display gemini_final_reasoning     
  - src/services/api.js — update analyze() to parse new response shape      

  Key changes to ReasoningScreen:
  1. Receive trace: ToolCallStep[] in route params
  2. Remove all setTimeout chains that drive fake agent state
  3. Drive agent cards from trace array length and content
  4. Each card's "done" state displays trace[i].result_summary via
  TypewriterText
  5. Add a GeminiReasoningCard at the bottom that shows
  gemini_final_reasoning
  6. Add real timing display: show actual duration_ms from each trace step  

  ResultsScreen addition: Add a collapsible "AI Reasoning" card at the top  
  showing gemini_final_reasoning. This is the most powerful judge-facing    
  change: they see the model's actual thought process in plain English.     

  ---
  PHASE J — UX Polish + Demo Optimization

  Time: 3 hours | Final phase

  Objective: Eliminate everything that could embarrass you during a live    
  demo.

  Tasks:

  1. Error screen: Add a reusable ErrorScreen component that shows when the 
  API is unreachable. Currently the app spins indefinitely. Add a 15-second 
  timeout with a retry button.
  2. Demo mode: Add a toggle in constants.js: DEMO_MODE = true. In demo     
  mode, the API call uses a hardcoded response that's always fast and always
   works. Use this if Gemini API has issues during the actual demo. Real    
  mode is the default.
  3. ReasoningScreen ask_clarification flow: If the API returns type:       
  "clarification_needed", navigate to a simple dialog instead of
  ResultsScreen. User picks an option, SearchScreen resubmits.
  4. Fix ProfileScreen settings menu: Either make taps navigate somewhere   
  (even a placeholder screen that says "Coming Soon"), or remove the        
  settings items that do nothing. A non-functional menu is worse than no    
  menu.
  5. Fix booking status in db.py: Already mentioned in Phase G. Critical for
   correct provider dashboard display.
  6. Swagger documentation: Update FastAPI route docstrings to describe the 
  new agentic behavior. Judges who inspect /docs will see professional      
  documentation.
  7. Health check endpoint: GET /api/health returning {"status": "ok",      
  "model": "gemini-2.0-flash", "agents": 4}. Judges often hit the health    
  endpoint first.
  8. Load testing: Run 3 consecutive queries through the full pipeline      
  before the demo. Confirm there are no cold-start issues, no SQLite lock   
  errors, no Gemini rate limit hits.

  ---
  SCORE PROJECTION AFTER IMPLEMENTATION

  ┌──────────────┬────────┬────────┬───────┬────────────────────────────┐   
  │  Criterion   │ Weight │ Before │ After │         Reasoning          │   
  ├──────────────┼────────┼────────┼───────┼────────────────────────────┤   
  │ Google       │        │        │       │ Real function-calling,     │   
  │ Antigravity  │  25%   │  4/10  │ 9/10  │ real orchestration, Gemini │   
  │              │        │        │       │  decides tool order        │   
  ├──────────────┼────────┼────────┼───────┼────────────────────────────┤   
  │ Agentic      │        │        │       │ Real traces, real final    │   
  │ Reasoning    │  20%   │  3/10  │ 8/10  │ reasoning text,            │   
  │              │        │        │       │ clarification flow         │   
  ├──────────────┼────────┼────────┼───────┼────────────────────────────┤   
  │ Matching     │        │        │       │ Real GPS, slot             │   
  │ Quality      │  20%   │  6/10  │ 7/10  │ availability, same math    │   
  │              │        │        │       │ but honest data            │   
  ├──────────────┼────────┼────────┼───────┼────────────────────────────┤   
  │ Action       │        │        │       │ Fixed PENDING default,     │   
  │ Simulation   │  15%   │  8/10  │ 9/10  │ slot conflict prevention,  │   
  │              │        │        │       │ persisted follow-ups       │   
  ├──────────────┼────────┼────────┼───────┼────────────────────────────┤   
  │ Technical    │        │        │       │ SSE streaming, clean       │   
  │ Impl         │  10%   │  7/10  │ 9/10  │ schemas, health endpoint,  │   
  │              │        │        │       │ Swagger docs               │   
  ├──────────────┼────────┼────────┼───────┼────────────────────────────┤   
  │ Innovation & │  10%   │  9/10  │ 9/10  │ Clarification flow is new; │   
  │  UX          │        │        │       │  rest already strong       │   
  └──────────────┴────────┴────────┴───────┴────────────────────────────┘   

  Projected score: 84–88 / 100
  