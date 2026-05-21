import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";

export default function ProviderProfileScreen() {
  const { userProfile, signOut } = useAuth();

  const initials = userProfile?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

  const stats = [
    { icon: "star", value: "4.8", label: "Rating", color: COLORS.warning },
    { icon: "briefcase-outline", value: "5+", label: "Yrs Exp", color: COLORS.primary },
    { icon: "shield-checkmark-outline", value: "Active", label: "Status", color: COLORS.success },
  ];

  const infoRows = [
    { icon: "construct-outline", label: "Category", value: userProfile?.category?.replace(/_/g, " ") || "Service Provider" },
    { icon: "location-outline", label: "Area", value: userProfile?.area || "Not set" },
    { icon: "business-outline", label: "City", value: userProfile?.city || "Not set" },
    { icon: "call-outline", label: "Phone", value: userProfile?.phone || "Not set" },
    { icon: "mail-outline", label: "Email", value: userProfile?.email || "" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Profile hero */}
        <LinearGradient colors={["#1C1409", "#130F05"]} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.glowOrb} />
          <LinearGradient colors={[COLORS.provider, "#D97706"]} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <Text style={styles.providerName}>{userProfile?.name || "Provider"}</Text>
          <View style={styles.categoryBadge}>
            <Ionicons name="construct-outline" size={12} color={COLORS.provider} />
            <Text style={styles.categoryText}>{userProfile?.category?.replace(/_/g, " ") || "Service Provider"}</Text>
          </View>
          {userProfile?.area && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.locationText}>{userProfile.area}{userProfile.city ? `, ${userProfile.city}` : ""}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statCard, { borderColor: s.color + "33" }]}>
              <Ionicons name={s.icon} size={18} color={s.color} style={{ marginBottom: 6 }} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Info */}
        <Text style={styles.sectionTitle}>Profile Details</Text>
        <View style={styles.infoCard}>
          {infoRows.map((row, i) => (
            <View key={i} style={[styles.infoRow, i < infoRows.length - 1 && styles.infoRowBorder]}>
              <View style={styles.infoIconBox}>
                <Ionicons name={row.icon} size={15} color={COLORS.provider} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* BookNFix badge */}
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={14} color={COLORS.primary} />
          <Text style={styles.aiBadgeText}>Listed on BookNFix · Powered by Groq AI</Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={16} color={COLORS.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 48 },

  heroCard: {
    borderRadius: RADIUS.xxl,
    padding: 28,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.provider + "33",
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.glowProvider,
  },
  glowOrb: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.provider + "08",
    top: -60,
    right: -60,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { fontSize: 30, ...FONTS.bold, color: "#fff" },
  providerName: { fontSize: 22, ...FONTS.extraBold, color: COLORS.text, marginBottom: 10 },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.providerGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.provider + "44",
    marginBottom: 10,
  },
  categoryText: { fontSize: 12, color: COLORS.provider, ...FONTS.semiBold },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  locationText: { fontSize: 13, color: COLORS.textSecondary },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  statValue: { fontSize: 18, ...FONTS.extraBold, marginBottom: 2 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium },

  sectionTitle: {
    fontSize: 11,
    ...FONTS.bold,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 20,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.providerGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, ...FONTS.medium, color: COLORS.text },

  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + "33",
  },
  aiBadgeText: { fontSize: 12, color: COLORS.primary, ...FONTS.medium },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.dangerGlow,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.danger + "44",
  },
  signOutText: { fontSize: 15, color: COLORS.danger, ...FONTS.semiBold },
});
