import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Pressable, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../contexts/AuthContext";
import { API } from "../../services/api";
import { COLORS, RADIUS, SHADOWS } from "../../constants/theme";
import { Avatar, StatusBadge, Pill, GlassCard, SpringIn, LiveDot } from "../../components/ui/SharedUI";

const PENDING_CALL_KEY = "serviceai_pending_call";

function AnimatedCounter({ target, color }) {
  const val = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    Animated.timing(val, { toValue: target, duration: 1200, useNativeDriver: false }).start();
    const id = val.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => val.removeListener(id);
  }, [target]);
  return <Text style={[styles.counterVal, { color }]}>{display}</Text>;
}

const CHART_BAR_H = 90;

function BookingChart({ data, maxVal }) {
  const barAnims   = useRef(data.map(() => new Animated.Value(0))).current;
  const labelAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    barAnims.forEach(a => a.setValue(0));
    labelAnims.forEach(a => a.setValue(0));
    Animated.parallel([
      ...data.map((d, i) =>
        Animated.timing(barAnims[i], {
          toValue: d.count > 0 ? Math.max((d.count / maxVal) * CHART_BAR_H, 10) : 4,
          duration: 750,
          delay: 150 + i * 65,
          useNativeDriver: false,
        })
      ),
      ...data.map((d, i) =>
        Animated.timing(labelAnims[i], {
          toValue: 1,
          duration: 400,
          delay: 700 + i * 65,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, [maxVal]);

  const quarter = maxVal > 3 ? Math.round(maxVal / 4) : null;
  const half    = maxVal > 1 ? Math.round(maxVal / 2) : null;
  const three4  = maxVal > 3 ? Math.round((maxVal * 3) / 4) : null;

  return (
    <View style={{ marginTop: 12 }}>
      {/* Chart title axes */}
      <View style={ch.axisTitleRow}>
        <Text style={ch.yAxisTitle}>Bookings</Text>
      </View>

      <View style={ch.root}>
        {/* Y-axis labels */}
        <View style={[ch.yAxis, { height: CHART_BAR_H + 4 }]}>
          <Text style={ch.yLbl}>{maxVal}</Text>
          {three4 !== null && <Text style={ch.yLbl}>{three4}</Text>}
          {half   !== null && <Text style={ch.yLbl}>{half}</Text>}
          {quarter !== null && <Text style={ch.yLbl}>{quarter}</Text>}
          <Text style={ch.yLbl}>0</Text>
        </View>

        {/* Plot area */}
        <View style={{ flex: 1 }}>
          <View style={{ height: CHART_BAR_H, position: "relative" }}>
            {/* Horizontal grid lines at 0%, 25%, 50%, 75%, 100% */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac, gi) => (
              <View key={gi} style={[ch.gridLine, { bottom: frac * CHART_BAR_H }]} />
            ))}
            {/* Y-axis rule */}
            <View style={ch.yRule} />
            {/* Animated bars + value labels on top */}
            <View style={ch.barsRow}>
              {data.map((d, i) => (
                <View key={i} style={ch.barCol}>
                  {/* Value label above bar */}
                  {d.count > 0 && (
                    <Animated.Text
                      style={[
                        ch.barValueLbl,
                        {
                          opacity: labelAnims[i],
                          transform: [{ translateY: labelAnims[i].interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
                        },
                      ]}
                    >
                      {d.count}
                    </Animated.Text>
                  )}
                  <Animated.View style={[ch.barInner, { height: barAnims[i] }]}>
                    <LinearGradient
                      colors={d.count > 0
                        ? [COLORS.primaryLight + "CC", COLORS.primary]
                        : [COLORS.border + "44", COLORS.border + "11"]}
                      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                      style={{ flex: 1 }}
                    />
                  </Animated.View>
                </View>
              ))}
            </View>
          </View>
          {/* X-axis rule */}
          <View style={ch.xLine} />
          {/* X-axis day labels */}
          <View style={ch.xRow}>
            {data.map((d, i) => (
              <Text key={i} style={ch.xLbl}>{d.day.slice(0, 3)}</Text>
            ))}
          </View>
          {/* X-axis title */}
          <Text style={ch.xAxisTitle}>Day of Week</Text>
        </View>
      </View>
    </View>
  );
}

const QUICK_QUERIES = [
  { text: "My AC is making a weird noise, please send someone today", icon: "snow-outline", color: COLORS.info },
  { text: "Need a doctor for my mother, she has fever", icon: "medkit-outline", color: COLORS.danger },
  { text: "Math tutor for class 9, near Saba Avenue", icon: "book-outline", color: COLORS.success },
];

export default function UserDashboard({ navigation }) {
  const { userProfile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCall, setPendingCall] = useState(null);   // { call_log_id, provider_name, service_type }
  const pendingPollRef = useRef(null);

  const name = userProfile?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const fetchData = useCallback(async () => {
    try {
      const mine = await API.getAllBookings(userProfile?.uid);
      setBookings(mine.slice(0, 4));

      const stats = await API.getAnalytics(userProfile?.uid);
      setAnalytics(stats);
    } catch (_) {
      setBookings([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile]);

  // ── Background pending-call poller ────────────────────────────────────────
  const clearPendingCall = useCallback(async () => {
    clearInterval(pendingPollRef.current);
    setPendingCall(null);
    await AsyncStorage.removeItem(PENDING_CALL_KEY);
  }, []);

  const startPendingCallPoll = useCallback((callLogId) => {
    const TERMINAL = new Set(["COMPLETED", "FAILED", "NO_ANSWER", "REJECTED"]);
    clearInterval(pendingPollRef.current);
    pendingPollRef.current = setInterval(async () => {
      try {
        const data = await API.getCallStatus(callLogId);
        const isTerminal = TERMINAL.has(data.status) || TERMINAL.has(data.outcome);
        if (isTerminal) {
          clearInterval(pendingPollRef.current);
          await AsyncStorage.removeItem(PENDING_CALL_KEY);
          setPendingCall(null);
          fetchData(); // refresh bookings list

          if (data.outcome === "ACCEPTED") {
            Alert.alert("Booking Confirmed!", "Your AI agent booking was accepted by the provider.");
          } else if (data.outcome === "SUGGESTED_TIME") {
            Alert.alert(
              "Provider Suggested a Time",
              `The provider suggested: ${data.suggested_time || "a different time"}.\n\nOpen the app and re-book to respond.`,
              [{ text: "OK" }]
            );
          } else if (data.outcome === "REJECTED") {
            Alert.alert("Provider Unavailable", data.reason || "The provider could not take the job.");
          } else if (data.outcome === "NO_ANSWER") {
            Alert.alert("No Answer", "The provider did not pick up. Try another provider.");
          }
        }
      } catch (_) { }
    }, 10000);
  }, [fetchData]);

  // Check AsyncStorage for an in-progress call when screen mounts
  useEffect(() => {
    const checkPending = async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_CALL_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        // If the stored call is older than 10 minutes, discard it
        if (Date.now() - saved.timestamp > 10 * 60 * 1000) {
          await AsyncStorage.removeItem(PENDING_CALL_KEY);
          return;
        }
        // Check current status — if already done, just clear; if still pending, show banner + poll
        const data = await API.getCallStatus(saved.call_log_id);
        const TERMINAL = new Set(["COMPLETED", "FAILED", "NO_ANSWER", "REJECTED"]);
        if (TERMINAL.has(data.status) || TERMINAL.has(data.outcome)) {
          await AsyncStorage.removeItem(PENDING_CALL_KEY);
          if (data.outcome === "ACCEPTED") {
            Alert.alert("Booking Confirmed!", "Your AI agent booking was accepted by the provider.");
          } else if (data.outcome === "SUGGESTED_TIME") {
            Alert.alert(
              "Provider Suggested a Time",
              `The provider suggested: ${data.suggested_time || "a different time"}.\n\nRe-open the booking flow to respond.`,
              [{ text: "OK" }]
            );
          }
        } else {
          setPendingCall(saved);
          startPendingCallPoll(saved.call_log_id);
        }
      } catch (_) { }
    };
    checkPending();
    return () => clearInterval(pendingPollRef.current);
  }, [startPendingCallPoll]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // date helper for the square calendar icon
  const getBadgeDate = (dateStr) => {
    if (!dateStr) return { top: "PEND", bottom: "—" };
    const lower = dateStr.toLowerCase();
    if (lower.includes("today")) return { top: "TODAY", bottom: "★" };
    if (lower.includes("tomorrow")) return { top: "TMRW", bottom: "☆" };

    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        const parts = dateStr.split(" ");
        if (parts.length >= 2) {
          return { top: parts[0].slice(0, 3).toUpperCase(), bottom: parts[1].replace(/\D/g, "") || "—" };
        }
        return { top: "DATE", bottom: dateStr.slice(0, 3) };
      }
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return { top: months[d.getMonth()], bottom: String(d.getDate()) };
    } catch {
      return { top: "DATE", bottom: "—" };
    }
  };

  const hasBookings = analytics && analytics.total_bookings > 0;

  // Real-time booking activity trend over the last 7 days from SQLite!
  const weeklyTrend = analytics?.weekly_trend || [
    { day: "Mon", count: 0 },
    { day: "Tue", count: 0 },
    { day: "Wed", count: 0 },
    { day: "Thu", count: 0 },
    { day: "Fri", count: 0 },
    { day: "Sat", count: 0 },
    { day: "Sun", count: 0 }
  ];

  const maxTrendCount = Math.max(...weeklyTrend.map(d => d.count), 1);

  // Real-time database metrics
  const totalBookingsCount = analytics?.total_bookings || 0;
  const todayBookingsCount = analytics?.today_bookings || 0;
  const pendingBookingsCount = analytics?.pending_bookings || 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(108,99,255,0.06)", "rgba(16,217,160,0.02)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 0.5 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Header */}
          <SpringIn delay={0}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.navigate("Profile")} activeOpacity={0.8}>
                <Avatar name={userProfile?.name || "U"} size={42} color={COLORS.primary} color2={COLORS.violet} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.name}>{userProfile?.name || "User"}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={styles.iconBtn}>
                <Ionicons name="notifications-outline" size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </SpringIn>

          {/* Pending AI Call Banner */}
          {pendingCall && (
            <SpringIn delay={50}>
              <View style={styles.pendingBanner}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingBannerTitle}>AI Agent is calling…</Text>
                  <Text style={styles.pendingBannerSub} numberOfLines={1}>
                    {pendingCall.provider_name} · {pendingCall.service_type}
                  </Text>
                </View>
                <TouchableOpacity onPress={clearPendingCall} style={styles.pendingBannerDismiss}>
                  <Ionicons name="close" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </SpringIn>
          )}

          {/* Bento stats */}
          <SpringIn delay={100}>
            <View style={[styles.px, styles.bento]}>
              {/* Big widescreen tile — Total Bookings with Compact Real Sparkline */}
              <View style={[styles.bentoCard, { flex: 1.4 }]}>
                <LinearGradient
                  colors={["rgba(108,99,255,0.06)", "transparent"]}
                  style={StyleSheet.absoluteFill}
                />
                <Pill 
                  color={todayBookingsCount > 0 ? COLORS.success : COLORS.primary} 
                  icon={todayBookingsCount > 0 ? "trending-up-outline" : "ticket-outline"} 
                  size="sm"
                >
                  {todayBookingsCount > 0 ? `+${todayBookingsCount} TODAY` : "ACTIVE USER"}
                </Pill>
                
                <AnimatedCounter target={totalBookingsCount} color={COLORS.text} />
                <Text style={styles.bentoLabel}>Total bookings placed</Text>
                
                <BookingChart data={weeklyTrend} maxVal={maxTrendCount} />
              </View>

              <View style={{ flex: 1, gap: 8 }}>
                {/* Pending Bookings Card */}
                <View style={[styles.bentoCard, { flex: 1 }]}>
                  <LinearGradient
                    colors={["rgba(245,158,11,0.06)", "transparent"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[styles.bentoIcon, { backgroundColor: COLORS.warning + "22", borderColor: COLORS.warning + "44" }]}>
                    <Ionicons name="time-outline" size={13} color={COLORS.warning} />
                  </View>
                  <Text style={[styles.counterVal, { color: COLORS.text, fontSize: 20, marginTop: 8 }]}>
                    {pendingBookingsCount}
                  </Text>
                  <Text style={styles.bentoLabel}>Pending status</Text>
                </View>

                {/* Today's Bookings Card */}
                <View style={[styles.bentoCard, { flex: 1 }]}>
                  <LinearGradient
                    colors={["rgba(16,217,160,0.06)", "transparent"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[styles.bentoIcon, { backgroundColor: COLORS.success + "22", borderColor: COLORS.success + "44" }]}>
                    <Ionicons name="today-outline" size={13} color={COLORS.success} />
                  </View>
                  <Text style={[styles.counterVal, { color: COLORS.text, fontSize: 20, marginTop: 8 }]}>
                    {todayBookingsCount}
                  </Text>
                  <Text style={styles.bentoLabel}>Today's list</Text>
                </View>
              </View>
            </View>
          </SpringIn>

          {/* Ask AI → Live Search Radar */}
          <SpringIn delay={200}>
            <View style={styles.px}>
              <TouchableOpacity onPress={() => navigation.navigate("LiveSearch")} activeOpacity={0.9}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.violet, COLORS.pink]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.searchOuter}
                >
                  <View style={styles.searchInner}>
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.violet]}
                      style={styles.searchIcon}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="sparkles" size={18} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="wifi-outline" size={14} color={COLORS.text} style={{ opacity: 0.9 }} />
                        <Text style={styles.searchTitle}>AI Agentic Service Providers</Text>
                      </View>
                      <Text style={styles.searchSub}>Real Time Google Business Radar</Text>
                    </View>
                    <LiveDot color={COLORS.success} />
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 6 }} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SpringIn>

          {/* Pending bookings */}
          {(() => {
            const pending = bookings.filter(b => b.status === "PENDING" || b.status === "pending");
            return (
              <>
                <Text style={styles.sectionLabel}>PENDING BOOKINGS</Text>
                <View style={[styles.px, { gap: 10 }]}>
                  {pending.length === 0 ? (
                    <View style={styles.emptyPendingCard}>
                      <LinearGradient
                        colors={["rgba(108,99,255,0.04)", "transparent"]}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={styles.emptyPendingIconContainer}>
                        <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.emptyPendingTitle}>All dispatches cleared</Text>
                        <Text style={styles.emptyPendingSub}>
                          Active bookings and real-time agent status logs will stream here when placed.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    pending.map((b, i) => (
                      <SpringIn key={b.booking_id || i} delay={300 + i * 60}>
                        <GlassCard style={styles.bookingCard} padding={16}>
                          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                            {/* Calendar Date Badge */}
                            {(() => {
                              const badgeDate = getBadgeDate(b.date);
                              return (
                                <View style={styles.dateBadge}>
                                  <Text style={styles.dateBadgeTop}>{badgeDate.top}</Text>
                                  <Text style={styles.dateBadgeBottom}>{badgeDate.bottom}</Text>
                                </View>
                              );
                            })()}

                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.bookingProvider} numberOfLines={1}>{b.provider_name || "Provider"}</Text>
                              <Text style={styles.bookingMeta} numberOfLines={1}>
                                {b.service || b.service_category || "Service"} · {b.time_slot?.startsWith("pending_") && b.suggested_time
                                  ? b.suggested_time
                                  : (b.time_slot || "Anytime")}
                              </Text>
                              <Text style={styles.bookingId}>{b.booking_id || `BK-${b.id}`}</Text>
                            </View>
                            <StatusBadge status={b.status} />
                          </View>
                        </GlassCard>
                      </SpringIn>
                    ))
                  )}
                </View>
              </>
            );
          })()}

          {/* Quick queries list */}
          <Text style={styles.sectionLabel}>TRY ASKING</Text>
          <View style={[styles.px, { gap: 8, paddingBottom: 24 }]}>
            {QUICK_QUERIES.map((q, i) => (
              <SpringIn key={i} delay={400 + i * 80}>
                <TouchableOpacity activeOpacity={0.85} style={styles.queryBtn}>
                  <LinearGradient
                    colors={[q.color + "10", "transparent"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[styles.queryIcon, { backgroundColor: q.color + "22", borderColor: q.color + "44" }]}>
                    <Ionicons name={q.icon} size={14} color={q.color} />
                  </View>
                  <Text style={styles.queryText} numberOfLines={2}>"{q.text}"</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} style={{ marginLeft: "auto" }} />
                </TouchableOpacity>
              </SpringIn>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  px: { paddingHorizontal: 20 },
  pendingBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginTop: 10, marginBottom: 4,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.primary + "55",
  },
  pendingBannerTitle: { fontSize: 12, fontWeight: "800", color: COLORS.primary, marginBottom: 1 },
  pendingBannerSub: { fontSize: 11, color: COLORS.textSecondary },
  pendingBannerDismiss: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  greeting: { fontSize: 11, color: COLORS.textSecondary },
  name: { fontSize: 16, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  searchOuter: { borderRadius: 20, padding: 1.5, marginTop: 14, marginBottom: 8 },
  searchInner: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  searchIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text, letterSpacing: -0.2 },
  searchSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 2 },
  bento: { flexDirection: "row", gap: 8, marginVertical: 8 },
  bentoCard: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 20, padding: 14, position: "relative", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  bentoIcon: {
    width: 28, height: 28, borderRadius: 9, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  counterVal: { fontSize: 32, fontWeight: "900", letterSpacing: -1, marginTop: 8 },
  bentoLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  sparkline: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginTop: 8, height: 32 },
  sparkBar: { flex: 1, borderRadius: 2 },
  sectionLabel: {
    fontSize: 10, color: COLORS.textMuted, fontWeight: "800", letterSpacing: 1.4,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  emptyPendingCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 20, paddingVertical: 18, paddingHorizontal: 16,
    overflow: "hidden", position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  emptyPendingIconContainer: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.primary + "33", backgroundColor: COLORS.primary + "15",
    alignItems: "center", justifyContent: "center",
  },
  emptyPendingTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text, letterSpacing: -0.2 },
  emptyPendingSub: { fontSize: 10.5, color: COLORS.textSecondary, lineHeight: 15 },
  bookingCard: { borderRadius: 20 },
  dateBadge: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  dateBadgeTop: {
    fontSize: 8, color: COLORS.textMuted, fontWeight: "900", letterSpacing: 0.4,
  },
  dateBadgeBottom: {
    fontSize: 13, fontWeight: "900", color: COLORS.text, marginTop: 1,
  },
  bookingProvider: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  bookingMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  bookingId: { fontSize: 9, color: COLORS.textMuted, fontFamily: "Courier New", marginTop: 4 },
  queryBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 12, overflow: "hidden", position: "relative",
  },
  queryIcon: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  queryText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});

const ch = StyleSheet.create({
  axisTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 2, paddingLeft: 28 },
  yAxisTitle:   { fontSize: 8, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },

  root:     { flexDirection: "row", gap: 4 },
  yAxis:    { width: 20, justifyContent: "space-between", alignItems: "flex-end", paddingRight: 4, paddingBottom: 2 },
  yLbl:     { fontSize: 7.5, color: COLORS.textMuted, fontWeight: "600", lineHeight: 9 },
  gridLine: {
    position: "absolute", left: 0, right: 0,
    height: StyleSheet.hairlineWidth, backgroundColor: COLORS.borderLight,
  },
  yRule: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    width: 1, backgroundColor: COLORS.border + "88",
  },
  barsRow: {
    position: "absolute", left: 2, right: 0, top: 0, bottom: 0,
    flexDirection: "row", alignItems: "flex-end",
  },
  barCol:      { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  barValueLbl: { fontSize: 8, color: COLORS.primaryLight, fontWeight: "900", marginBottom: 2 },
  barInner:    { width: "68%", borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: "hidden" },
  xLine:       { height: 1, backgroundColor: COLORS.border + "88" },
  xRow:        { flexDirection: "row", marginTop: 5 },
  xLbl:        { flex: 1, fontSize: 8, color: COLORS.textMuted, textAlign: "center", fontWeight: "600" },
  xAxisTitle:  { fontSize: 8, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", textAlign: "center", marginTop: 4 },
});
