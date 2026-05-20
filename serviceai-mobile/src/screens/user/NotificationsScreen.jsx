import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../services/api";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";

const STATUS_META = {
  PENDING:   { icon: "time-outline",            color: COLORS.warning,  label: "Booking Pending" },
  CONFIRMED: { icon: "checkmark-circle-outline", color: COLORS.success,  label: "Booking Confirmed" },
  CANCELLED: { icon: "close-circle-outline",     color: COLORS.danger,   label: "Booking Cancelled" },
  DEFAULT:   { icon: "receipt-outline",          color: COLORS.info,     label: "Booking Update" },
};

function NotifCard({ booking }) {
  const meta = STATUS_META[booking.status] || STATUS_META.DEFAULT;
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: meta.color + "18" }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{meta.label}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {booking.service} with {booking.provider_name} on {booking.date} at {booking.time_slot?.split("–")[0]?.trim()}
        </Text>
        <Text style={styles.bookingId}>Booking #{booking.id}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
    </View>
  );
}

export default function NotificationsScreen() {
  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await API.getAllBookings();
      setBookings([...data].reverse());
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title2}>Notifications</Text>
        <Text style={styles.subtitle}>{bookings.length} booking updates</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NotifCard booking={item} />}
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
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>Your booking updates will appear here</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingBottom: 10 },
  title2:   { fontSize: 26, ...FONTS.extraBold, color: COLORS.text, marginBottom: 3 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },

  list: { padding: 16, paddingBottom: 48 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  title:     { fontSize: 13, ...FONTS.semiBold, color: COLORS.text, marginBottom: 3 },
  body:      { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 3 },
  bookingId: { fontSize: 11, color: COLORS.textMuted },
  statusDot: { width: 8, height: 8, borderRadius: 4, alignSelf: "flex-start", marginTop: 4 },

  empty:      { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.text },
  emptySub:   { fontSize: 13, color: COLORS.textMuted },
});
