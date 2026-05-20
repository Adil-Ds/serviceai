import { BASE_URL, DEMO_MODE } from "../config/constants";

const DEMO_RESPONSE = {
  // intent matches ParsedIntent schema
  intent: {
    service_category: "plumber",
    location: "DHA, Karachi",
    city: "Karachi",
    area: "DHA",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // tomorrow
    budget_max_pkr: 2000,
    urgency: "scheduled",
    special_requirements: null,
    raw_input: "mujhe kal DHA mein plumber chahiye",
  },
  providers_found: 3,
  // ranked_providers matches RankedProvider schema: { provider, score, distance_km, score_breakdown, reason, rank }
  ranked_providers: [
    {
      provider: {
        id: "DEMO-P001",
        name: "Ahmad Plumbing Services",
        category: "plumber",
        area: "DHA",
        city: "Karachi",
        lat: 24.81,
        lng: 67.075,
        rating: 4.8,
        review_count: 42,
        price_min: 1800,
        price_max: 2500,
        available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        phone: "0300-1234567",
        experience_years: 7,
        verified: true,
      },
      score: 94.5,
      distance_km: 1.2,
      score_breakdown: { distance_km: 1.2, distance_score: 88.0, rating_score: 96.0, price_score: 90.0, reviews_score: 84.0, total: 94.5 },
      reason: "Top-rated plumber in DHA with 7 years experience, well within your budget at Rs. 1800.",
      rank: 1,
    },
    {
      provider: {
        id: "DEMO-P002",
        name: "Karachi Fix Masters",
        category: "plumber",
        area: "DHA",
        city: "Karachi",
        lat: 24.82,
        lng: 67.07,
        rating: 4.6,
        review_count: 28,
        price_min: 1500,
        price_max: 2000,
        available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        phone: "0321-7654321",
        experience_years: 5,
        verified: true,
      },
      score: 88.3,
      distance_km: 2.1,
      score_breakdown: { distance_km: 2.1, distance_score: 79.0, rating_score: 92.0, price_score: 100.0, reviews_score: 56.0, total: 88.3 },
      reason: "Budget-friendly option at Rs. 1500 with solid 4.6 rating — great value for your need.",
      rank: 2,
    },
    {
      provider: {
        id: "DEMO-P003",
        name: "ProPipe Solutions",
        category: "plumber",
        area: "DHA",
        city: "Karachi",
        lat: 24.80,
        lng: 67.08,
        rating: 4.4,
        review_count: 55,
        price_min: 2000,
        price_max: 3000,
        available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        phone: "0333-9876543",
        experience_years: 10,
        verified: true,
      },
      score: 82.1,
      distance_km: 3.4,
      score_breakdown: { distance_km: 3.4, distance_score: 66.0, rating_score: 88.0, price_score: 100.0, reviews_score: 100.0, total: 82.1 },
      reason: "Most experienced provider with 10 years; matches your exact Rs. 2000 budget ceiling.",
      rank: 3,
    },
  ],
  // tool_call_trace matches ToolCallStep schema exactly
  tool_call_trace: [
    {
      step: 1,
      tool: "parse_intent",
      tool_display_name: "Intent Parser",
      icon: "language-outline",
      args: { text: "mujhe kal DHA mein plumber chahiye" },
      result_summary: "Detected: plumber in DHA, Karachi. Date: tomorrow. Urgency: scheduled. Budget: ₨2,000.",
      status: "success",
      duration_ms: 420,
    },
    {
      step: 2,
      tool: "search_providers",
      tool_display_name: "Provider Search",
      icon: "search-outline",
      args: { service_category: "plumber", city: "Karachi", area: "DHA" },
      result_summary: "Found 8 active plumbers in DHA Karachi. After filtering: 8 in category, 5 in DHA, 5 available, 3 within budget.",
      status: "success",
      duration_ms: 85,
    },
    {
      step: 3,
      tool: "rank_providers",
      tool_display_name: "Ranking Engine",
      icon: "podium-outline",
      args: { user_area: "DHA", budget_max_pkr: 2000, urgency: "scheduled" },
      result_summary: "Ranked 8 providers. #1: Ahmad Plumbing Services — score 94.5, 1.2 km away, rating 4.8/5. Reason: Top-rated with 7 years experience.",
      status: "success",
      duration_ms: 680,
    },
  ],
  gemini_final_reasoning:
    "The user needs a plumber in DHA Karachi with a budget of Rs. 2000. I called parse_intent to extract structured requirements, then search_providers to filter 8 matching professionals. Finally, rank_providers applied a weighted scoring formula combining rating (35%), proximity (35%), and price fit (20%). Ahmad Plumbing Services ranked #1 with a score of 94.5 — highest rated, closest at 1.2 km, and comfortably under budget at Rs. 1800.",
  model: "llama-3.3-70b-versatile (DEMO)",
  total_duration_ms: 1185,
  iterations: 3,
};

const request = async (endpoint, method = "GET", body = null) => {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }
  return response.json();
};

export const API = {
  health: () => request("/health"),

  // Full pipeline POST (returns when complete); returns mock instantly when DEMO_MODE is on
  analyze: (userText, userLat = null, userLng = null) => {
    if (DEMO_MODE) {
      return Promise.resolve({
        ...DEMO_RESPONSE,
        intent: { ...DEMO_RESPONSE.intent, raw_input: userText },
      });
    }
    return request("/api/analyze", "POST", {
      text: userText,
      user_lat: userLat,
      user_lng: userLng,
    });
  },

  // SSE stream URL — used directly with EventSource on web
  streamUrl: (userText, userLat = null, userLng = null) => {
    const params = new URLSearchParams({ q: userText });
    if (userLat != null) params.set("user_lat", userLat);
    if (userLng != null) params.set("user_lng", userLng);
    return `${BASE_URL}/api/analyze/stream?${params.toString()}`;
  },

  // Individual agents
  parseIntent: (userText) =>
    request("/api/parse-intent", "POST", { text: userText }),

  searchProviders: (intent) =>
    request("/api/search-providers", "POST", intent),

  rankProviders: (providers, intent) =>
    request("/api/rank-providers", "POST", { providers, intent }),

  // Agent 4 — Book
  book: (bookingData, phone) =>
    request("/api/book", "POST", { booking: bookingData, phone: phone || "0300-0000000" }),

  // Agent 5 — Follow-ups
  scheduleFollowups: (confirmation) =>
    request("/api/schedule-followups", "POST", confirmation),

  // Booking management
  getAllBookings: (userId = null) => {
    const qs = userId ? `?user_id=${userId}` : "";
    return request(`/api/bookings${qs}`);
  },
  getAnalytics: (userId) => {
    if (!userId) return Promise.resolve(null);
    return request(`/api/analytics?user_id=${userId}`);
  },
  getBooking: (bookingId) => request(`/api/bookings/${bookingId}`),
  updateBookingStatus: (bookingId, status) =>
    request(`/api/bookings/${bookingId}/status`, "PUT", { status }),

  // Provider-scoped bookings
  getProviderBookings: (providerId, status = null) => {
    const qs = status ? `?status=${status}` : "";
    return request(`/api/provider/bookings/${providerId}${qs}`);
  },

  // Booked slots for a provider on a date
  getBookedSlots: (providerId, date) =>
    request(`/api/booked-slots/${providerId}/${date}`),

  // Follow-ups persisted in SQLite for a booking
  getFollowups: (bookingId) => request(`/api/followups/${bookingId}`),

  // Providers list
  getProviders: () => request("/api/providers"),

  // ── Real-Time Scraper ──────────────────────────────────
  scrape: (serviceType, location, city, userLat = null, userLng = null, maxResults = 10) =>
    request("/api/scrape", "POST", {
      service_type: serviceType,
      location: location || "",
      city,
      user_lat: userLat,
      user_lng: userLng,
      max_results: maxResults,
    }),

  getScrapeIndex: () => request("/api/scrape/index"),

  // Returns the most recently stored user live location from the backend
  getLocation: () => request("/api/location"),

  // Agentic Caller — fires outbound VAPI call, returns call_log_id immediately
  initiateCall: (body) => request("/api/caller/initiate-async", "POST", body),
  // Poll until call completes — returns { status, outcome, suggested_time, reason, transcript }
  getCallStatus: (callLogId) => request(`/api/caller/status/${callLogId}`),
  // After provider suggests a time: ACCEPT their time or COUNTER with user_proposed_time
  confirmCall: (callLogId, userDecision, userProposedTime = null) =>
    request("/api/caller/confirm", "POST", {
      call_log_id: callLogId,
      user_decision: userDecision,
      user_proposed_time: userProposedTime,
    }),
  // Returns all call logs still in INITIATED status (used for startup reconciliation)
  getPendingCalls: () => request("/api/caller/pending"),

  // Heavyweight Chrome scraper pipeline — takes 3-8 min, returns businesses + LLM report
  findBusiness: (service, address) => {
    if (DEMO_MODE) {
      return Promise.resolve({
        service: service || "Plumber",
        address: address || "Lahore",
        businesses: [
          {
            rank: 1,
            name: "Premium Plumbing & Maintenance Solutions",
            rating: "4.9",
            review_count: "184",
            address: address || "DHA Phase 5, Lahore, Pakistan",
            phone: "0300-9876543",
            website: "https://premiumplumbing.com",
            distance_km: 1.2,
            rating_score: 39.2,
            review_score: 28.5,
            distance_score: 26.4,
            total_score: 94.1,
          },
          {
            rank: 2,
            name: "Model Colony Technical Repair Masters",
            rating: "4.7",
            review_count: "92",
            address: address || "Model Colony, Lahore, Pakistan",
            phone: "0321-4567890",
            website: null,
            distance_km: 2.5,
            rating_score: 37.6,
            review_score: 24.2,
            distance_score: 22.5,
            total_score: 84.3,
          },
          {
            rank: 3,
            name: "QuickFix Technical Services",
            rating: "4.5",
            review_count: "48",
            address: address || "Tajpura, Lahore, Pakistan",
            phone: "0333-1122334",
            website: "https://quickfix.pk",
            distance_km: 4.1,
            rating_score: 36.0,
            review_score: 18.5,
            distance_score: 17.7,
            total_score: 72.2,
          }
        ],
        report: `Google Maps scrape for "${service}" near "${address}" returned 3 highly rated professionals. Premium Plumbing & Maintenance Solutions ranked #1 with an exceptional 4.9 rating and close proximity of 1.2km. Model Colony Technical Repair Masters is also a solid choice at 2.5km. All providers have verified phone contacts.`,
        report_file: "mock_report.txt"
      });
    }
    return request("/api/find-business", "POST", { service, address });
  },
};
