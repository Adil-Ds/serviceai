import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";
import { API } from "../../services/api";

const CHANNEL_ICONS = {
  SMS: "chatbubble-outline",
  "Push Notification": "notifications-outline",
  "In-App": "phone-portrait-outline",
};
const TRIGGER_COLORS = {
  day_before: COLORS.info,
  day_of: COLORS.warning,
  completion: COLORS.success,
};

export default function ConfirmationScreen({ route, navigation }) {
  const { confirmation: b, followups, provider } = route.params;

  // Follow-ups: prefer DB fetch (persistent), fall back to route params
  const [fups, setFups] = useState(followups?.followups || []);
  const [fupLoading, setFupLoading] = useState(true);

  const successScale = useRef(new Animated.Value(0.4)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(contentOpacity, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  // Fetch persisted follow-ups from SQLite via API
  useEffect(() => {
    if (!b?.booking_id) { setFupLoading(false); return; }
    API.getFollowups(b.booking_id)
      .then((data) => {
        if (data?.followups?.length > 0) setFups(data.followups);
      })
      .catch(() => {}) // fallback: keep route.params followups
      .finally(() => setFupLoading(false));
  }, []);

  const receiptRows = [
    ["Service", b.service],
    ["Provider", b.provider_name],
    ["Date", b.date],
    ["Time", b.time_slot],
    ["Address", b.location_address],
    ["Contact", b.phone],
    ["Price Agreed", `₨${b.price_agreed?.toLocaleString()}`],
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Success hero */}
        <Animated.View style={[styles.heroWrap, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
          <LinearGradient
            colors={["rgba(16,217,160,0.15)", "rgba(16,217,160,0.04)", "transparent"]}
            style={styles.heroGrad}
          >
            {/* Outer ring */}
            <View style={styles.heroRing}>
              <View style={styles.heroCircle}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </View>
            </View>

            <Text style={styles.heroTitle}>Booking Confirmed!</Text>

            <View style={styles.bookingIdBox}>
              <Text style={styles.bookingIdLabel}>Booking ID</Text>
              <Text style={styles.bookingId}>{b.booking_id}</Text>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{b.status}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity }}>
          {/* Provider mini */}
          {provider && (
            <View style={styles.providerMini}>
              <LinearGradient colors={[COLORS.primary, "#8B5CF6"]} style={styles.providerAvatar}>
                <Text style={styles.providerAvatarText}>{provider.name[0]}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <View style={styles.providerMeta}>
                  <Ionicons name="star" size={12} color={COLORS.warning} />
                  <Text style={styles.providerMetaText}>{provider.rating} · {provider.phone}</Text>
                </View>
              </View>
              <View style={styles.confirmedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              </View>
            </View>
          )}

          {/* Receipt */}
          <View style={styles.receipt}>
            <View style={styles.receiptHeader}>
              <Ionicons name="receipt-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.receiptTitle}>Booking Receipt</Text>
            </View>
            {receiptRows.map(([label, value]) => (
              <View key={label} style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>{label}</Text>
                <Text style={styles.receiptValue} numberOfLines={2}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Follow-ups */}
          <View style={styles.fupSection}>
            <View style={styles.fupHeader}>
              <Ionicons name="notifications" size={16} color={COLORS.primary} />
              <Text style={styles.fupTitle}>Automated Follow-Ups</Text>
              {fupLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
            </View>
            <Text style={styles.fupSub}>
              {fupLoading ? "Loading from database…" : `Agent 5 scheduled ${fups.length} automated messages`}
            </Text>

            {fups.map((f, i) => (
              <View key={i} style={[styles.fupCard, { borderLeftColor: TRIGGER_COLORS[f.trigger] || COLORS.primary }]}>
                <View style={styles.fupCardHeader}>
                  <View style={[styles.fupIconBox, { backgroundColor: (TRIGGER_COLORS[f.trigger] || COLORS.primary) + "18" }]}>
                    <Ionicons name={CHANNEL_ICONS[f.channel] || "mail-outline"} size={14} color={TRIGGER_COLORS[f.trigger] || COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.fupChannel}>{f.channel}</Text>
                    <Text style={styles.fupTrigger}>{f.trigger_label}</Text>
                  </View>
                </View>
                <Text style={styles.fupMessage}>"{f.message}"</Text>
              </View>
            ))}

            <View style={styles.agentBadge}>
              <Ionicons name="sparkles" size={12} color={COLORS.primary} />
              <Text style={styles.agentBadgeText}>Agent 5 (Follow-Up Planner) · {fups.length} messages scheduled</Text>
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate("UserTabs", { screen: "BookingHistory" })}
            activeOpacity={0.85}
          >
            <Ionicons name="receipt-outline" size={18} color="#fff" />
            <Text style={styles.historyBtnText}>View All Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate("UserTabs")}
            activeOpacity={0.85}
          >
            <Ionicons name="home-outline" size={18} color={COLORS.text} />
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 48 },

  heroWrap: { marginBottom: 20, borderRadius: RADIUS.xxl, overflow: "hidden", borderWidth: 1, borderColor: COLORS.success + "44", ...SHADOWS.glowSuccess },
  heroGrad: { padding: 32, alignItems: "center" },
  heroRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.successGlow,
    borderWidth: 2,
    borderColor: COLORS.success + "44",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 26, ...FONTS.extraBold, color: COLORS.success, marginBottom: 18 },
  bookingIdBox: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: RADIUS.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  bookingIdLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 },
  bookingId: { fontSize: 22, ...FONTS.extraBold, color: COLORS.text, letterSpacing: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  statusText: { fontSize: 13, color: COLORS.success, ...FONTS.semiBold },

  providerMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  providerAvatarText: { fontSize: 20, color: "#fff", ...FONTS.bold },
  providerName: { fontSize: 15, ...FONTS.semiBold, color: COLORS.text, marginBottom: 3 },
  providerMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  providerMetaText: { fontSize: 12, color: COLORS.textSecondary },
  confirmedBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.successGlow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.success + "44",
  },

  receipt: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  receiptTitle: { fontSize: 12, ...FONTS.bold, color: COLORS.text, textTransform: "uppercase", letterSpacing: 0.5 },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  receiptLabel: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  receiptValue: { fontSize: 12, color: COLORS.text, ...FONTS.medium, flex: 2, textAlign: "right" },

  fupSection: { marginBottom: 24 },
  fupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  fupTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  fupSub: { fontSize: 12, color: COLORS.textMuted, marginBottom: 14 },
  fupCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fupCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  fupIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fupChannel: { fontSize: 13, ...FONTS.semiBold, color: COLORS.text, marginBottom: 1 },
  fupTrigger: { fontSize: 11, color: COLORS.textMuted },
  fupMessage: { fontSize: 12, color: COLORS.textSecondary, fontStyle: "italic", lineHeight: 18 },
  agentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    padding: 12,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: COLORS.primary + "33",
    marginTop: 4,
  },
  agentBadgeText: { fontSize: 12, color: COLORS.primary, ...FONTS.medium },

  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    marginBottom: 10,
  },
  historyBtnText: { color: "#fff", fontSize: 15, ...FONTS.semiBold },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeBtnText: { color: COLORS.text, fontSize: 14, ...FONTS.medium },
});
