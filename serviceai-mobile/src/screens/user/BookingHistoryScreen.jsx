import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, Alert, TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../services/api";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";
import { StatusBadge } from "../../components/ui/Badge";
import { SkeletonCard } from "../../components/ui/Skeleton";

// ── AI Negotiation Panel ───────────────────────────────────────────────────────
function AgentNegotiationPanel({ booking, onResolved }) {
  const [phase,       setPhase]       = useState("idle"); // idle | calling | done
  const [counterTime, setCounterTime] = useState("");

  const doConfirm = async (decision, proposedTime = null) => {
    setPhase("calling");
    try {
      const res = await API.confirmCall(booking.call_log_id, decision, proposedTime);
      setPhase("done");

      if (res.outcome === "ACCEPTED") {
        Alert.alert("Booking Confirmed!", "The provider confirmed your appointment.");
        onResolved("CONFIRMED");
      } else if (res.outcome === "SUGGESTED_TIME") {
        Alert.alert(
          "Provider Suggested Again",
          `They now propose: ${res.suggested_time || "a different time"}.\n\nThe booking remains pending — refresh to act again.`,
          [{ text: "OK" }]
        );
        onResolved("PENDING_REFRESH");
      } else if (res.outcome === "REJECTED" || res.outcome === "USER_REJECTED") {
        Alert.alert("Booking Cancelled", "The booking has been cancelled.");
        onResolved("CANCELLED");
      }
    } catch (e) {
      setPhase("idle");
      Alert.alert("Error", "Could not process your response. Try again.\n" + e.message);
    }
  };

  if (phase === "calling") {
    return (
      <View style={s.negotiationBox}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={s.negCallingText}>AI Agent is calling the provider…</Text>
      </View>
    );
  }

  if (phase === "done") {
    return null;
  }

  return (
    <View style={s.negotiationBox}>
      <LinearGradient
        colors={["rgba(255,165,0,0.08)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.negHeader}>
        <View style={s.negDot} />
        <Text style={s.negTitle}>Provider Suggested a Time</Text>
      </View>

      <View style={s.suggestedRow}>
        <Ionicons name="time-outline" size={15} color={COLORS.warning} />
        <Text style={s.suggestedTime}>{booking.suggested_time || "Alternative time"}</Text>
      </View>

      <Text style={s.negHint}>Accept their slot, propose a different time, or decline.</Text>

      {/* Accept */}
      <TouchableOpacity
        style={s.acceptBtn}
        onPress={() => doConfirm("ACCEPT")}
        activeOpacity={0.87}
      >
        <LinearGradient
          colors={[COLORS.success, "#0CB888"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.acceptBtnGrad}
        >
          <Ionicons name="checkmark-circle" size={15} color="#fff" />
          <Text style={s.acceptBtnText}>Accept {booking.suggested_time}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Counter */}
      <TextInput
        style={s.counterInput}
        value={counterTime}
        onChangeText={setCounterTime}
        placeholder="Propose different time, e.g. Monday 3pm"
        placeholderTextColor={COLORS.textMuted}
      />
      {counterTime.trim() ? (
        <TouchableOpacity
          style={s.counterBtn}
          onPress={() => doConfirm("COUNTER", counterTime.trim())}
          activeOpacity={0.87}
        >
          <Ionicons name="repeat-outline" size={14} color={COLORS.primary} />
          <Text style={s.counterBtnText}>Counter with "{counterTime}"</Text>
        </TouchableOpacity>
      ) : null}

      {/* Reject */}
      <TouchableOpacity
        style={s.rejectBtn}
        onPress={() =>
          Alert.alert(
            "Decline & Cancel",
            "This will cancel the booking. Are you sure?",
            [
              { text: "Keep", style: "cancel" },
              { text: "Decline", style: "destructive", onPress: () => doConfirm("REJECT") },
            ]
          )
        }
        activeOpacity={0.8}
      >
        <Ionicons name="close-circle-outline" size={14} color={COLORS.danger} />
        <Text style={s.rejectBtnText}>Decline — cancel this booking</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Booking Card ───────────────────────────────────────────────────────────────
function BookingCard({ booking, onCancel, onRefresh }) {
  const isAIPending = booking.status === "PENDING" && !!booking.call_log_id;
  const canCancel   = booking.status === "PENDING" && !booking.call_log_id;

  const handleResolved = (newStatus) => {
    if (newStatus === "PENDING_REFRESH") {
      onRefresh();
    } else {
      onRefresh();
    }
  };

  return (
    <View style={[styles.card, isAIPending && styles.cardAIPending]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.service}>{booking.service}</Text>
          <Text style={styles.provider}>{booking.provider_name}</Text>
          <Text style={styles.bookingId}>#{booking.id}</Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      {isAIPending && (
        <View style={styles.aiAgentChip}>
          <Ionicons name="sparkles" size={11} color={COLORS.primary} />
          <Text style={styles.aiAgentChipText}>AI Agent Negotiation</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.metaText}>
            {isAIPending ? "Negotiating…" : booking.date}
          </Text>
        </View>
        {!isAIPending && (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{booking.time_slot?.split("–")[0]?.trim()}</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.metaText}>₨{booking.price_agreed?.toLocaleString()}</Text>
        </View>
      </View>

      {booking.location_address && !booking.location_address.startsWith("pending_") ? (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.addressText} numberOfLines={1}>{booking.location_address}</Text>
        </View>
      ) : null}

      {/* AI negotiation panel — only for PENDING AI bookings */}
      {isAIPending && (
        <AgentNegotiationPanel booking={booking} onResolved={handleResolved} />
      )}

      {canCancel && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => onCancel(booking.id)}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={14} color={COLORS.danger} />
          <Text style={styles.cancelBtnText}>Cancel Booking</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const FILTERS = [
  { key: "ALL",       label: "All" },
  { key: "PENDING",   label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "CANCELLED", label: "Cancelled" },
];
const FILTER_COLORS = {
  ALL:       COLORS.primary,
  PENDING:   COLORS.warning,
  CONFIRMED: COLORS.success,
  CANCELLED: COLORS.danger,
};

export default function BookingHistoryScreen() {
  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState("ALL");
  const [cancelling, setCancelling] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await API.getAllBookings();
      setBookings(data);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleCancel = (bookingId) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelling(bookingId);
            try {
              await API.updateBookingStatus(bookingId, "CANCELLED");
              setBookings((prev) =>
                prev.map((b) => b.id === bookingId ? { ...b, status: "CANCELLED" } : b)
              );
            } catch (e) {
              Alert.alert("Error", "Could not cancel booking. Please try again.\n" + e.message);
            } finally {
              setCancelling(null);
            }
          },
        },
      ]
    );
  };

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
  const pending   = bookings.filter((b) => b.status === "PENDING").length;

  const displayed = filter === "ALL"
    ? bookings
    : bookings.filter((b) => b.status === filter);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>{bookings.length} total · {confirmed} confirmed · {pending} pending</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const color  = FILTER_COLORS[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, active && { backgroundColor: color + "20", borderColor: color + "66" }]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, active && { color }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onCancel={handleCancel}
              cancelling={cancelling === item.id}
              onRefresh={fetchData}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>
                {filter === "ALL" ? "No bookings yet" : `No ${filter.toLowerCase()} bookings`}
              </Text>
              <Text style={styles.emptySub}>
                {filter === "ALL" ? "Book a service from the Home tab" : "Try a different filter"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingBottom: 10 },
  title:    { fontSize: 26, ...FONTS.extraBold, color: COLORS.text, marginBottom: 3 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },

  filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  filterTabText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },

  list: { padding: 16, paddingTop: 8, paddingBottom: 48 },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardAIPending: {
    borderColor: COLORS.warning + "55",
    shadowColor: COLORS.warning,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTop:    { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  service:    { fontSize: 15, ...FONTS.bold, color: COLORS.text, marginBottom: 3 },
  provider:   { fontSize: 13, color: COLORS.textSecondary, marginBottom: 3 },
  bookingId:  { fontSize: 11, color: COLORS.textMuted },

  aiAgentChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.full,
    paddingHorizontal: 9, paddingVertical: 4, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.primary + "44",
  },
  aiAgentChipText: { fontSize: 10, color: COLORS.primary, ...FONTS.semiBold },

  divider:    { height: 1, backgroundColor: COLORS.border, marginBottom: 10 },
  metaRow:    { flexDirection: "row", gap: 16, marginBottom: 8 },
  metaItem:   { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText:   { fontSize: 12, color: COLORS.textSecondary },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  addressText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },

  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 12, paddingVertical: 9,
    borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.danger + "44",
    backgroundColor: COLORS.dangerGlow,
  },
  cancelBtnText: { fontSize: 13, color: COLORS.danger, ...FONTS.semiBold },

  empty:      { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.text },
  emptySub:   { fontSize: 13, color: COLORS.textMuted },
});

// ── Negotiation panel styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  negotiationBox: {
    marginTop: 10, borderRadius: RADIUS.md, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.warning + "44",
    backgroundColor: COLORS.surface, padding: 12,
    position: "relative",
  },
  negHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  negDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warning,
    shadowColor: COLORS.warning, shadowOpacity: 0.9, shadowRadius: 4,
  },
  negTitle: { fontSize: 12, ...FONTS.bold, color: COLORS.warning },
  suggestedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  suggestedTime: { fontSize: 15, ...FONTS.extraBold, color: COLORS.warning },
  negHint: { fontSize: 11, color: COLORS.textMuted, marginBottom: 12 },

  acceptBtn: { borderRadius: RADIUS.md, overflow: "hidden", marginBottom: 8 },
  acceptBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 11,
  },
  acceptBtnText: { color: "#fff", fontSize: 13, ...FONTS.bold },

  counterInput: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.text, fontSize: 13, marginBottom: 6,
  },
  counterBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10,
    borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.primary + "55",
    backgroundColor: COLORS.primaryGlow, marginBottom: 8,
  },
  counterBtnText: { fontSize: 13, color: COLORS.primary, ...FONTS.semiBold },

  rejectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.danger + "33",
    backgroundColor: COLORS.dangerGlow,
  },
  rejectBtnText: { fontSize: 12, color: COLORS.danger, ...FONTS.medium },

  negCallingText: { fontSize: 12, color: COLORS.primary, ...FONTS.semiBold },
});
