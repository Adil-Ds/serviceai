import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";

const STATUS_META = {
  PENDING:   { icon: "time-outline",            color: COLORS.warning,  label: "Booking Pending" },
  CONFIRMED: { icon: "checkmark-circle-outline", color: COLORS.success,  label: "Booking Confirmed" },
  CANCELLED: { icon: "close-circle-outline",     color: COLORS.danger,   label: "Booking Cancelled" },
  REMINDER:  { icon: "alarm-outline",            color: COLORS.primary,  label: "Upcoming Reminder" },
  DEFAULT:   { icon: "receipt-outline",          color: COLORS.info,     label: "Booking Update" },
};

const LAST_READ_KEY = "serviceai_last_read_notifications";

// Robust Date & Time parsing helpers to evaluate 1-hour service arrival thresholds
function getBookingDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  
  let targetDate = new Date();
  const lowerDate = dateStr.toLowerCase();
  
  if (lowerDate.includes("tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lowerDate.includes("today")) {
    // Keep current date
  } else {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }
  
  if (timeStr) {
    if (timeStr.startsWith("pending_")) {
      return null; // Still in negotiation
    }
    const cleanTime = timeStr.split("–")[0]?.trim().split("-")[0]?.trim(); // e.g. "07:00 AM" or "7:00 AM"
    const match = cleanTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      
      targetDate.setHours(hours, minutes, 0, 0);
    }
  }
  
  return targetDate;
}

function getMinutesUntilBooking(dateStr, timeStr) {
  const target = getBookingDateTime(dateStr, timeStr);
  if (!target) return null;
  
  const diffMs = target.getTime() - Date.now();
  const diffMins = diffMs / (1000 * 60);
  return diffMins;
}

function NotifCard({ booking, isUnread }) {
  const meta = STATUS_META[booking.status] || STATUS_META.DEFAULT;
  
  // Fix double booking prefix
  const displayId = (() => {
    const rawId = booking.booking_id || booking.id || "";
    if (!rawId) return "—";
    const str = String(rawId).toUpperCase();
    if (str.startsWith("BK-")) return str;
    return `BK-${str}`;
  })();

  // Render a special, glowing status card if this is a time-scheduled service reminder
  if (booking.status === "REMINDER") {
    return (
      <View style={[
        styles.card,
        {
          borderColor: COLORS.primary,
          backgroundColor: "rgba(108, 99, 255, 0.07)",
          borderWidth: 1.5
        }
      ]}>
        <View style={[styles.unreadMarker, { backgroundColor: COLORS.primary }]} />
        <View style={[styles.iconBox, { backgroundColor: COLORS.primary + "18" }]}>
          <Ionicons name="alarm-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Text style={[styles.title, { color: COLORS.primary }]}>Upcoming Service Reminder</Text>
            <View style={[styles.newBadge, { backgroundColor: COLORS.primary + "22" }]}>
              <Text style={[styles.newBadgeText, { color: COLORS.primary }]}>SOON</Text>
            </View>
          </View>
          <Text style={[styles.body, { color: COLORS.text, fontWeight: "600" }]} numberOfLines={3}>
            Your {booking.service} dispatch with {booking.provider_name} is scheduled to arrive in {booking.minutes_left} minutes (at {booking.time_slot?.split("–")[0]?.trim()}). Please prepare the area!
          </Text>
          <Text style={styles.bookingId}>Booking #{displayId}</Text>
        </View>
      </View>
    );
  }

  // Format the time text, replacing raw SQL keys with suggested readable times
  const displayTime = booking.time_slot?.startsWith("pending_") && booking.suggested_time
    ? booking.suggested_time
    : (booking.date ? `${booking.date} at ${booking.time_slot?.split("–")[0]?.trim()}` : "Anytime");

  return (
    <View style={[
      styles.card,
      isUnread && {
        borderColor: COLORS.primary + "66",
        backgroundColor: "rgba(108, 99, 255, 0.05)",
      }
    ]}>
      {isUnread && <View style={styles.unreadMarker} />}

      <View style={[styles.iconBox, { backgroundColor: meta.color + "18" }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <Text style={styles.title}>{meta.label}</Text>
          {isUnread && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {booking.service || "Service"} with {booking.provider_name || "Provider"} on {displayTime}
        </Text>
        <Text style={styles.bookingId}>Booking #{displayId}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
    </View>
  );
}

export default function NotificationsScreen() {
  const { userProfile } = useAuth();
  const [bookings,     setBookings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [lastReadTime, setLastReadTime] = useState(0);

  // Load last read timestamp from AsyncStorage
  const loadLastReadTime = async () => {
    try {
      const saved = await AsyncStorage.getItem(LAST_READ_KEY);
      if (saved) {
        setLastReadTime(parseInt(saved, 10));
      } else {
        const defaultPast = Date.now() - 6 * 60 * 60 * 1000;
        setLastReadTime(defaultPast);
      }
    } catch (_) {}
  };

  const fetchData = useCallback(async () => {
    try {
      await loadLastReadTime();
      const data = await API.getAllBookings(userProfile?.uid);
      
      const now = Date.now();
      const injectedReminders = [];
      
      // Auto-scan confirmed bookings for 1-hour before notification reminders
      data.forEach(b => {
        if (b.status?.toUpperCase() === "CONFIRMED" || b.status?.toUpperCase() === "confirmed") {
          const minutesLeft = getMinutesUntilBooking(b.date, b.time_slot);
          
          // Trigger if booking starts in less than 60 minutes
          const isSoon = minutesLeft !== null && minutesLeft > 0 && minutesLeft <= 60;
          
          // Visual Demo Fallback: if booking is scheduled for Today or Tomorrow, also trigger reminder
          const isDemoActive = b.date?.toLowerCase().includes("today") || b.date?.toLowerCase().includes("tomorrow");
          
          if (isSoon || isDemoActive) {
            injectedReminders.push({
              id: `reminder-${b.id || b.booking_id}`,
              booking_id: b.booking_id || b.id,
              service: b.service || b.service_category || "Service",
              provider_name: b.provider_name || "Provider",
              date: b.date,
              time_slot: b.time_slot,
              status: "REMINDER", // special status
              created_at: new Date(now - 1000).toISOString(), // Set as fresh so it highlights as unread
              location_address: b.location_address,
              minutes_left: isSoon ? Math.round(minutesLeft) : 45
            });
          }
        }
      });
      
      // Sort: newest booking/reminder first
      const sorted = [...injectedReminders, ...data].sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0);
        const dateB = new Date(b.created_at || b.date || 0);
        return dateB - dateA;
      });
      
      setBookings(sorted);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchData();
    
    // Mark notifications as read after 3 seconds of viewing the screen
    const timer = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(LAST_READ_KEY, String(Date.now()));
      } catch (_) {}
    }, 3000);

    return () => clearTimeout(timer);
  }, [fetchData]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title2}>Notifications</Text>
        <Text style={styles.subtitle}>{bookings.length} booking updates</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item.id || item.booking_id)}
          renderItem={({ item }) => {
            const itemTime = new Date(item.created_at || item.date).getTime();
            const isUnread = itemTime > lastReadTime;
            return <NotifCard booking={item} isUnread={isUnread} />;
          }}
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
              <Ionicons name="notifications-off-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>Your booking updates will appear here</Text>
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
    position: "relative",
    overflow: "hidden",
  },
  unreadMarker: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: COLORS.primary,
  },
  newBadge: {
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primary + "33",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  title:     { fontSize: 13, ...FONTS.bold, color: COLORS.text },
  body:      { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 3 },
  bookingId: { fontSize: 11, color: COLORS.textMuted },
  statusDot: { width: 8, height: 8, borderRadius: 4, alignSelf: "flex-start", marginTop: 4 },

  empty:      { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.text },
  emptySub:   { fontSize: 13, color: COLORS.textMuted },
});
