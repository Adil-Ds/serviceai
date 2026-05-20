import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API } from "../../services/api";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";
import { StatusBadge } from "../../components/ui/Badge";
import { SkeletonCard } from "../../components/ui/Skeleton";

function RequestCard({ booking, onAccept, onDecline }) {
  const isPending = booking.status === "PENDING";

  return (
    <View style={[styles.card, isPending && styles.cardPending]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.service}>{booking.service}</Text>
          <Text style={styles.bookingId}>#{booking.id}</Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      <View style={styles.infoGrid}>
        {[
          { icon: "person-outline", text: booking.user_name },
          { icon: "calendar-outline", text: `${booking.date} · ${booking.time_slot?.split("–")[0]?.trim()}` },
          { icon: "location-outline", text: booking.location_address },
          { icon: "cash-outline", text: `₨${booking.price_agreed?.toLocaleString()}` },
        ].map((item, i) => (
          <View key={i} style={styles.infoRow}>
            <Ionicons name={item.icon} size={13} color={COLORS.textMuted} />
            <Text style={styles.infoText} numberOfLines={2}>{item.text}</Text>
          </View>
        ))}
      </View>

      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(booking.id)} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => onDecline(booking.id)} activeOpacity={0.85}>
            <Ionicons name="close" size={16} color={COLORS.danger} />
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function BookingRequestsScreen() {
  const { userProfile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const linkedProviderId = userProfile?.linkedProviderId || null;

  const fetchData = useCallback(async () => {
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

  useEffect(() => { fetchData(); }, []);

  const handleAccept = async (id) => {
    try {
      await API.updateBookingStatus(id, "CONFIRMED");
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "CONFIRMED" } : b));
    } catch (e) { Alert.alert("Error", "Could not accept booking."); }
  };

  const handleDecline = async (id) => {
    try {
      await API.updateBookingStatus(id, "CANCELLED");
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "CANCELLED" } : b));
    } catch (e) { Alert.alert("Error", "Could not decline booking."); }
  };

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;
  const filtered = filter === "ALL" ? bookings : bookings.filter((b) => b.status === filter);

  const FILTERS = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: pendingCount > 0 ? `Pending (${pendingCount})` : "Pending" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Booking Requests</Text>
        <Text style={styles.subtitle}>{bookings.length} total · {pendingCount} need action</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RequestCard booking={item} onAccept={handleAccept} onDecline={handleDecline} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.provider} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No {filter.toLowerCase()} bookings</Text>
              <Text style={styles.emptySub}>Pull to refresh</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 26, ...FONTS.extraBold, color: COLORS.text, marginBottom: 3 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 4, flexWrap: "wrap" },
  filterTab: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: { backgroundColor: COLORS.providerGlow, borderColor: COLORS.provider + "55" },
  filterText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  filterTextActive: { color: COLORS.provider, ...FONTS.semiBold },
  list: { padding: 16, paddingTop: 12, paddingBottom: 48 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardPending: { borderColor: COLORS.warning + "55" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12, gap: 10 },
  service: { fontSize: 15, ...FONTS.bold, color: COLORS.text, marginBottom: 2 },
  bookingId: { fontSize: 11, color: COLORS.textMuted },
  infoGrid: { gap: 7, marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  actionRow: { flexDirection: "row", gap: 10 },
  acceptBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: COLORS.success, borderRadius: RADIUS.md, paddingVertical: 11,
  },
  acceptText: { color: "#fff", fontSize: 14, ...FONTS.semiBold },
  declineBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.md, paddingVertical: 11,
    borderWidth: 1, borderColor: COLORS.danger + "44",
  },
  declineText: { color: COLORS.danger, fontSize: 14, ...FONTS.semiBold },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted },
});
