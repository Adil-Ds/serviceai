import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API } from "../../services/api";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";
import { StatusBadge } from "../../components/ui/Badge";
import { SkeletonCard } from "../../components/ui/Skeleton";

function StatCard({ icon, value, label, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 7, delay: 200, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.statCard, { borderColor: color + "33", opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 8 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function BookingRow({ booking, onAccept, onDecline }) {
  return (
    <View style={styles.bookingRow}>
      <View style={styles.bookingLeft}>
        <Text style={styles.bookingService}>{booking.service}</Text>
        <View style={styles.bookingMeta}>
          <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.bookingMetaText}>{booking.user_name}</Text>
        </View>
        <View style={styles.bookingMeta}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.bookingMetaText}>{booking.date} · {booking.time_slot?.split("–")[0]?.trim()}</Text>
        </View>
        <View style={styles.bookingMeta}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.bookingMetaText} numberOfLines={1}>{booking.location_address}</Text>
        </View>
        <Text style={styles.bookingPrice}>₨{booking.price_agreed?.toLocaleString()}</Text>
      </View>

      {booking.status === "PENDING" ? (
        <View style={styles.actionCol}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(booking.id)}>
            <Ionicons name="checkmark" size={16} color={COLORS.success} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => onDecline(booking.id)}>
            <Ionicons name="close" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ alignSelf: "flex-start" }}>
          <StatusBadge status={booking.status} />
        </View>
      )}
    </View>
  );
}

export default function ProviderDashboard({ navigation }) {
  const { userProfile, signOut } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const providerCategory = userProfile?.category || "Service Provider";
  const providerArea = userProfile?.area || "";
  const linkedProviderId = userProfile?.linkedProviderId || null;
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const data = linkedProviderId
        ? await API.getProviderBookings(linkedProviderId)
        : await API.getAllBookings();
      setBookings(data);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [linkedProviderId]);

  useEffect(() => { fetchBookings(); }, []);

  const handleAccept = async (bookingId) => {
    try {
      await API.updateBookingStatus(bookingId, "CONFIRMED");
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "CONFIRMED" } : b));
    } catch (e) { console.warn(e.message); }
  };

  const handleDecline = async (bookingId) => {
    try {
      await API.updateBookingStatus(bookingId, "CANCELLED");
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "CANCELLED" } : b));
    } catch (e) { console.warn(e.message); }
  };

  const recentBookings = bookings.slice(0, 6);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} tintColor={COLORS.provider} />}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <View>
            <View style={styles.categoryBadge}>
              <Ionicons name="construct-outline" size={10} color={COLORS.provider} />
              <Text style={styles.categoryText}>{providerCategory.replace(/_/g, " ").toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{userProfile?.name || "Provider"}</Text>
            {providerArea ? (
              <View style={styles.areaRow}>
                <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.area}>{providerArea}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Earnings card */}
        <LinearGradient colors={["#1C1409", "#130F05"]} style={styles.earningsCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.earningsGlow} />
          <Text style={styles.earningsLabel}>Total Earnings (Simulated)</Text>
          <Text style={styles.earningsValue}>₨{(confirmedCount * 2000).toLocaleString()}</Text>
          <View style={styles.earningsRow}>
            {[
              { value: bookings.length, label: "Total", color: COLORS.text },
              { value: pendingCount, label: "Pending", color: COLORS.warning },
              { value: confirmedCount, label: "Confirmed", color: COLORS.success },
            ].map((item, i) => (
              <React.Fragment key={i}>
                <View style={styles.earningsStat}>
                  <Text style={[styles.earningsStatVal, { color: item.color }]}>{item.value}</Text>
                  <Text style={styles.earningsStatLabel}>{item.label}</Text>
                </View>
                {i < 2 && <View style={styles.earningsDivider} />}
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>

        {/* Pending alert */}
        {pendingCount > 0 && (
          <TouchableOpacity style={styles.pendingAlert} onPress={() => navigation.navigate("BookingRequests")} activeOpacity={0.85}>
            <View style={styles.pendingLeft}>
              <View style={styles.pendingIconBox}>
                <Ionicons name="notifications" size={16} color={COLORS.warning} />
              </View>
              <View>
                <Text style={styles.pendingTitle}>{pendingCount} Pending Request{pendingCount !== 1 ? "s" : ""}</Text>
                <Text style={styles.pendingSub}>Tap to view and respond</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.warning} />
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="star" value="4.8" label="Rating" color={COLORS.warning} />
          <StatCard icon="receipt-outline" value={bookings.length} label="All Jobs" color={COLORS.primary} />
          <StatCard icon="checkmark-circle-outline" value={confirmedCount} label="Completed" color={COLORS.success} />
        </View>

        {/* Recent bookings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate("BookingRequests")}>
            <Text style={styles.seeAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : recentBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="inbox-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No bookings yet. Your profile is live!</Text>
          </View>
        ) : (
          recentBookings.map((b, i) => (
            <BookingRow key={i} booking={b} onAccept={handleAccept} onDecline={handleDecline} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 48 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.providerGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.provider + "44",
    marginBottom: 6,
  },
  categoryText: { fontSize: 10, color: COLORS.provider, ...FONTS.bold },
  name: { fontSize: 24, ...FONTS.extraBold, color: COLORS.text, marginBottom: 4 },
  areaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  area: { fontSize: 12, color: COLORS.textSecondary },
  signOutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  earningsCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.provider + "33",
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.glowProvider,
  },
  earningsGlow: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.provider + "12",
  },
  earningsLabel: { fontSize: 11, color: COLORS.provider, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  earningsValue: { fontSize: 36, ...FONTS.extraBold, color: COLORS.text, marginBottom: 18 },
  earningsRow: { flexDirection: "row", alignItems: "center" },
  earningsStat: { flex: 1, alignItems: "center" },
  earningsStatVal: { fontSize: 20, ...FONTS.bold, marginBottom: 2 },
  earningsStatLabel: { fontSize: 11, color: COLORS.textMuted },
  earningsDivider: { width: 1, height: 32, backgroundColor: COLORS.border },

  pendingAlert: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.warningGlow,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.warning + "44",
  },
  pendingLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  pendingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.warningGlow,
    borderWidth: 1,
    borderColor: COLORS.warning + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingTitle: { fontSize: 14, ...FONTS.semiBold, color: COLORS.warning, marginBottom: 2 },
  pendingSub: { fontSize: 11, color: COLORS.textSecondary },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  statValue: { fontSize: 22, ...FONTS.extraBold, marginBottom: 3 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 12, ...FONTS.bold, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 },
  seeAll: { fontSize: 13, color: COLORS.provider, ...FONTS.medium },

  bookingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingLeft: { flex: 1 },
  bookingService: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text, marginBottom: 6 },
  bookingMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  bookingMetaText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  bookingPrice: { fontSize: 13, ...FONTS.semiBold, color: COLORS.success, marginTop: 4 },

  actionCol: { gap: 8, marginLeft: 10 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.successGlow,
    borderWidth: 1,
    borderColor: COLORS.success + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.dangerGlow,
    borderWidth: 1,
    borderColor: COLORS.danger + "44",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: "center" },
});
