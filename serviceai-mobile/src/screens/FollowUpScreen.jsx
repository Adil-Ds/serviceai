import React from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FONTS, RADIUS } from "../constants/theme";

const CHANNEL_ICONS = { SMS: "💬", "Push Notification": "🔔", "In-App": "📱" };
const TRIGGER_COLORS = {
  day_before: COLORS.primary,
  day_of: COLORS.warning,
  completion: COLORS.success,
};

export default function FollowUpScreen({ route, navigation }) {
  const { confirmation, followups } = route.params;
  const b = confirmation;
  const fups = followups?.followups || [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Success banner */}
        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.bookingId}>#{b.booking_id}</Text>
        </View>

        {/* Receipt card */}
        <View style={styles.receipt}>
          <Text style={styles.receiptTitle}>📄 Booking Receipt</Text>
          {[
            ["Service", b.service],
            ["Provider", b.provider_name],
            ["Date", b.date],
            ["Time", b.time_slot],
            ["Address", b.location_address],
            ["Contact", b.phone],
            ["Price Agreed", `₨${b.price_agreed?.toLocaleString()}`],
            ["Status", b.status],
          ].map(([label, value]) => (
            <View key={label} style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{label}</Text>
              <Text style={[styles.receiptValue, label === "Status" && styles.statusText]}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {/* Follow-ups */}
        <Text style={styles.sectionTitle}>🔔 Automated Follow-Ups</Text>
        <Text style={styles.sectionSub}>Agent 5 has scheduled 3 automated messages</Text>

        {fups.map((f, i) => (
          <View key={i} style={[styles.fupCard, { borderLeftColor: TRIGGER_COLORS[f.trigger] || COLORS.primary }]}>
            <View style={styles.fupHeader}>
              <Text style={styles.fupIcon}>{CHANNEL_ICONS[f.channel] || "📩"}</Text>
              <View>
                <Text style={styles.fupChannel}>{f.channel}</Text>
                <Text style={styles.fupTrigger}>{f.trigger_label}</Text>
              </View>
            </View>
            <Text style={styles.fupMessage}>"{f.message}"</Text>
          </View>
        ))}

        {/* Agent 5 badge */}
        <View style={styles.agentBadge}>
          <Text style={styles.agentBadgeText}>
            🤖 Agent 5 (Follow-Up Planner) · 3 messages scheduled
          </Text>
        </View>

        {/* Done */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.doneBtnText}>← Book Another Service</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 40 },
  successBanner: {
    alignItems: "center", backgroundColor: COLORS.success + "18",
    borderRadius: RADIUS.xl, padding: 24, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.success + "44",
  },
  successIcon: { fontSize: 40, marginBottom: 8 },
  successTitle: { fontSize: 22, ...FONTS.bold, color: COLORS.success },
  bookingId: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  receipt: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  receiptTitle: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text, marginBottom: 12 },
  receiptRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  receiptLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  receiptValue: { fontSize: 13, color: COLORS.text, ...FONTS.medium, flex: 2, textAlign: "right" },
  statusText: { color: COLORS.success, ...FONTS.bold },
  sectionTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: COLORS.textMuted, marginBottom: 14 },
  fupCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: 14, marginBottom: 12, borderLeftWidth: 3,
  },
  fupHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  fupIcon: { fontSize: 22 },
  fupChannel: { fontSize: 13, ...FONTS.semiBold, color: COLORS.text },
  fupTrigger: { fontSize: 11, color: COLORS.textMuted },
  fupMessage: { fontSize: 13, color: COLORS.textSecondary, fontStyle: "italic", lineHeight: 18 },
  agentBadge: {
    backgroundColor: COLORS.primary + "18", borderRadius: RADIUS.md,
    padding: 12, alignItems: "center", marginTop: 4, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.primary + "33",
  },
  agentBadgeText: { fontSize: 12, color: COLORS.primary, ...FONTS.medium },
  doneBtn: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  doneBtnText: { color: COLORS.text, fontSize: 15, ...FONTS.semiBold },
});
