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
import { COLORS, RADIUS, SHADOWS, SERVICE_CATEGORIES } from "../../constants/theme";
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

const QUICK_QUERIES = [
  { text: "My AC is making a weird noise, please send someone today", icon: "snow-outline", color: COLORS.info },
  { text: "Need a doctor for my mother, she has fever", icon: "medkit-outline", color: COLORS.danger },
  { text: "Math tutor for class 9, near Saba Avenue", icon: "book-outline", color: COLORS.success },
];

export default function UserDashboard({ navigation }) {
  const { userProfile } = useAuth();
  const [bookings,     setBookings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [pendingCall,  setPendingCall]  = useState(null);   // { call_log_id, provider_name, service_type }
  const pendingPollRef = useRef(null);

  const name = userProfile?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const fetchData = useCallback(async () => {
    try {
      const all = await API.getAllBookings();
      const uid = userProfile?.uid;
      const mine = uid
        ? all.filter(b => b.user_id === uid || b.user_name === userProfile?.name)
        : all.slice(0, 3);
      setBookings(mine.slice(0, 4));
    } catch (_) {
      setBookings([]);
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
      } catch (_) {}
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
      } catch (_) {}
    };
    checkPending();
    return () => clearInterval(pendingPollRef.current);
  }, [startPendingCallPoll]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const pending = bookings.filter(b => b.status === "PENDING" || b.status === "pending").length;
  const confirmed = bookings.filter(b => b.status === "CONFIRMED" || b.status === "confirmed").length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(108,99,255,0.18)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 0.5 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Header */}
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

          {/* Pending AI Call Banner */}
          {pendingCall && (
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
          )}

          {/* Search hero */}
          <View style={styles.px}>
            <TouchableOpacity onPress={() => navigation.navigate("Search")} activeOpacity={0.9}>
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
                    <Text style={styles.searchTitle}>Tell AI what you need</Text>
                    <Text style={styles.searchSub}>Google Maps · Real businesses · AI ranked</Text>
                  </View>
                  <Ionicons name="mic-outline" size={16} color={COLORS.textMuted} />
                  <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 6 }} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Bento stats */}
          <View style={[styles.px, styles.bento]}>
            {/* Big tile — provider count */}
            <View style={[styles.bentoCard, { flex: 1.4 }]}>
              <View style={styles.bentoGlow} />
              <Pill color={COLORS.success} icon="trending-up-outline" size="sm">+12 TODAY</Pill>
              <AnimatedCounter target={47} color={COLORS.text} />
              <Text style={styles.bentoLabel}>Providers near you</Text>
              {/* Sparkline */}
              <View style={styles.sparkline}>
                {[30, 45, 38, 58, 52, 74, 68, 85, 80, 92].map((h, i) => (
                  <View key={i} style={[styles.sparkBar, { height: `${h}%`, backgroundColor: COLORS.success + (i === 9 ? "FF" : "88") }]} />
                ))}
              </View>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={[styles.bentoCard, { flex: 1 }]}>
                <View style={[styles.bentoIcon, { backgroundColor: COLORS.primary + "22", borderColor: COLORS.primary + "44" }]}>
                  <Ionicons name="ticket-outline" size={13} color={COLORS.primary} />
                </View>
                <Text style={[styles.counterVal, { color: COLORS.text, fontSize: 20, marginTop: 8 }]}>{bookings.length}</Text>
                <Text style={styles.bentoLabel}>Bookings</Text>
              </View>
              <View style={[styles.bentoCard, { flex: 1 }]}>
                <View style={[styles.bentoIcon, { backgroundColor: COLORS.warning + "22", borderColor: COLORS.warning + "44" }]}>
                  <Ionicons name="cash-outline" size={13} color={COLORS.warning} />
                </View>
                <Text style={[styles.counterVal, { color: COLORS.text, fontSize: 18, marginTop: 8 }]}>₨12.4K</Text>
                <Text style={styles.bentoLabel}>Saved</Text>
              </View>
            </View>
          </View>

          {/* Live search radar button */}
          <View style={styles.px}>
            <TouchableOpacity onPress={() => navigation.navigate("LiveSearch")} style={styles.radarBtn} activeOpacity={0.85}>
              <View style={[styles.radarIcon, { backgroundColor: COLORS.success + "22", borderColor: COLORS.success + "44" }]}>
                <Ionicons name="wifi-outline" size={18} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <LiveDot color={COLORS.success} />
                  <Text style={styles.radarTitle}>Live Search Radar</Text>
                </View>
                <Text style={styles.radarSub}>See providers on a real-time map</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <Text style={styles.sectionLabel}>CATEGORIES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            {SERVICE_CATEGORIES.map((s) => (
              <TouchableOpacity
                key={s.key}
                onPress={() => navigation.navigate("Search", { prefill: s.label })}
                style={styles.catBtn}
                activeOpacity={0.8}
              >
                <View style={[styles.catIcon, { backgroundColor: s.color + "22", borderColor: s.color + "44" }]}>
                  <Text style={{ fontSize: 14 }}>{s.icon}</Text>
                </View>
                <Text style={styles.catLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Recent bookings */}
          {bookings.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>RECENT BOOKINGS</Text>
              <View style={[styles.px, { gap: 8 }]}>
                {bookings.map((b, i) => (
                  <SpringIn key={b.booking_id || i} delay={i * 60}>
                    <GlassCard style={styles.bookingCard}>
                      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                        <View style={styles.bookingDate}>
                          <Text style={styles.bookingDateNum}>
                            {b.date ? b.date.split("-")[2] || b.date.slice(0, 5) : "—"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bookingProvider}>{b.provider_name || "Provider"}</Text>
                          <Text style={styles.bookingMeta}>{b.service_category || "Service"} · {b.time_slot || b.date || ""}</Text>
                          <Text style={styles.bookingId}>{b.booking_id || ""}</Text>
                        </View>
                        <StatusBadge status={b.status} />
                      </View>
                    </GlassCard>
                  </SpringIn>
                ))}
              </View>
            </>
          )}

          {/* Quick queries */}
          <Text style={styles.sectionLabel}>TRY ASKING</Text>
          <View style={[styles.px, { gap: 8, paddingBottom: 24 }]}>
            {QUICK_QUERIES.map((q, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => navigation.navigate("Search", { prefill: q.text })}
                style={styles.queryBtn}
                activeOpacity={0.8}
              >
                <View style={[styles.queryIcon, { backgroundColor: q.color + "22", borderColor: q.color + "44" }]}>
                  <Ionicons name={q.icon} size={14} color={q.color} />
                </View>
                <Text style={styles.queryText} numberOfLines={2}>"{q.text}"</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textDim} />
              </TouchableOpacity>
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
  searchOuter: { borderRadius: 18, padding: 2, marginTop: 14, marginBottom: 8 },
  searchInner: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  searchIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  searchSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 2 },
  bento: { flexDirection: "row", gap: 8, marginVertical: 8 },
  bentoCard: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 12, position: "relative", overflow: "hidden",
  },
  bentoGlow: {
    position: "absolute", top: -20, right: -20, width: 80, height: 80,
    borderRadius: 40, backgroundColor: COLORS.success + "33",
  },
  bentoIcon: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  counterVal: { fontSize: 32, fontWeight: "900", letterSpacing: -1, marginTop: 8 },
  bentoLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  sparkline: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginTop: 8, height: 32 },
  sparkBar: { flex: 1, borderRadius: 2 },
  radarBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 12, marginBottom: 8,
  },
  radarIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  radarTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  radarSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 2 },
  sectionLabel: {
    fontSize: 10, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 1.4,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  catScroll: { paddingHorizontal: 20, gap: 8 },
  catBtn: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, padding: 10, paddingHorizontal: 12,
    flexDirection: "row", alignItems: "center", gap: 7,
  },
  catIcon: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 12, fontWeight: "600", color: COLORS.text },
  bookingCard: { borderRadius: 16 },
  bookingDate: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  bookingDateNum: { fontSize: 13, fontWeight: "900", color: COLORS.text },
  bookingProvider: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  bookingMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  bookingId: { fontSize: 9, color: COLORS.textMuted, fontFamily: "Courier New", marginTop: 4 },
  queryBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, padding: 12,
  },
  queryIcon: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  queryText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});
