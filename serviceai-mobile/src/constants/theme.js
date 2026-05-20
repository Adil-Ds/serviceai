export const COLORS = {
  // Core backgrounds
  bg: "#070710",
  surface: "#0D0D1C",
  card: "#111127",
  cardAlt: "#161630",
  elevated: "#1A1A38",

  // Borders
  border: "#1E1E40",
  borderLight: "#2A2A55",
  borderGlow: "rgba(108,99,255,0.3)",

  // Brand — Indigo
  primary: "#6C63FF",
  primaryDark: "#5549E8",
  primaryLight: "#8B85FF",
  primaryGlow: "rgba(108,99,255,0.18)",
  primaryGlowStrong: "rgba(108,99,255,0.32)",

  // Semantic
  success: "#10D9A0",
  successDark: "#0CB888",
  successGlow: "rgba(16,217,160,0.16)",
  warning: "#F59E0B",
  warningGlow: "rgba(245,158,11,0.16)",
  danger: "#EF4444",
  dangerGlow: "rgba(239,68,68,0.16)",
  info: "#38BDF8",
  infoGlow: "rgba(56,189,248,0.18)",

  // Extended palette
  violet: "#A78BFA",
  violetGlow: "rgba(167,139,250,0.18)",
  pink: "#EC4899",
  pinkGlow: "rgba(236,72,153,0.16)",
  gold: "#FFD56B",
  amber: "#FFB020",

  // Provider accent — amber
  provider: "#F59E0B",
  providerGlow: "rgba(245,158,11,0.16)",

  // Agent colors
  agent1: "#38BDF8",
  agent2: "#6C63FF",
  agent3: "#10D9A0",
  agent4: "#F59E0B",
  agent5: "#A78BFA",

  // Text
  text: "#EEEEFF",
  textSecondary: "#A6A6CC",
  textMuted: "#7878A8",
  textDim: "#404068",
  textInverse: "#070710",
  textCode: "#A78BFA",

  // Gradients (passed to LinearGradient)
  gradientPrimary: ["#6C63FF", "#8B85FF"],
  gradientPrimaryFull: ["#6C63FF", "#A78BFA", "#EC4899"],
  gradientSuccess: ["#10D9A0", "#0CB888"],
  gradientProvider: ["#F59E0B", "#D97706"],
  gradientDark: ["#111127", "#070710"],
  gradientCard: ["#1A1A38", "#111127"],
  gradientDeep: ["#0D0D1C", "#070710"],
};

export const FONTS = {
  regular: { fontFamily: "System", fontWeight: "400" },
  medium: { fontFamily: "System", fontWeight: "500" },
  semiBold: { fontFamily: "System", fontWeight: "600" },
  bold: { fontFamily: "System", fontWeight: "700" },
  extraBold: { fontFamily: "System", fontWeight: "800" },
  mono: { fontFamily: "Courier New", fontWeight: "400" },
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  glowSuccess: {
    shadowColor: "#10D9A0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  glowProvider: {
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const SERVICE_CATEGORIES = [
  { key: "plumber",        label: "Plumber",     icon: "🔧", color: "#38BDF8" },
  { key: "electrician",   label: "Electrician", icon: "⚡", color: "#F59E0B" },
  { key: "doctor",        label: "Doctor",      icon: "🏥", color: "#EF4444" },
  { key: "tutor",         label: "Tutor",       icon: "📚", color: "#10D9A0" },
  { key: "ac_technician", label: "AC Tech",     icon: "❄️", color: "#8B85FF" },
  { key: "carpenter",     label: "Carpenter",   icon: "🪚", color: "#D97706" },
  { key: "cleaner",       label: "Cleaner",     icon: "🧹", color: "#06B6D4" },
  { key: "painter",       label: "Painter",     icon: "🎨", color: "#EC4899" },
  { key: "mechanic",      label: "Mechanic",    icon: "🔩", color: "#64748B" },
  { key: "pest_control",  label: "Pest Control",icon: "🐛", color: "#84CC16" },
  { key: "cook",          label: "Cook/Chef",   icon: "👨‍🍳", color: "#F97316" },
  { key: "security_guard",label: "Security",    icon: "🛡️", color: "#6366F1" },
];

export const CATEGORIES = SERVICE_CATEGORIES;

export const AGENT_META = [
  { n: 1, name: "Intent Parser", icon: "🧠", color: "#38BDF8", tool: "parse_intent()", desc: "Extracting service, location, budget & urgency" },
  { n: 2, name: "Provider Search", icon: "🔍", color: "#6C63FF", tool: "search_providers()", desc: "Filtering 50 providers by category, city & area" },
  { n: 3, name: "Ranking Engine", icon: "📊", color: "#10D9A0", tool: "rank_by_score()", desc: "Scoring by distance 35% · rating 35% · price 20% · reviews 10%" },
  { n: 4, name: "Booking Agent", icon: "📋", color: "#F59E0B", tool: "create_booking()", desc: "Creating booking in SQLite database" },
  { n: 5, name: "Follow-Up Planner", icon: "🔔", color: "#A78BFA", tool: "schedule_followups()", desc: "Scheduling automated reminder messages" },
];
