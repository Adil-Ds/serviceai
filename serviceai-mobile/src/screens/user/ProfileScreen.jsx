import React, { useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";

const FEATURES = [
  { icon: "sparkles-outline", label: "Groq AI Engine", desc: "Natural language understanding", badge: "Active" },
  { icon: "git-network-outline", label: "5-Agent Pipeline", desc: "Intent → Search → Rank → Book → Follow-up", badge: "Running" },
  { icon: "location-outline", label: "Haversine Distance", desc: "Accurate km-based matching", badge: null },
  { icon: "shield-checkmark-outline", label: "Firebase Auth", desc: "Secure authentication", badge: null },
  { icon: "server-outline", label: "FastAPI Backend", desc: "SQLite persistence", badge: null },
];

const MENU_ITEMS = [
  { icon: "receipt-outline",     label: "Booking History",          color: COLORS.primary, action: "BookingHistory" },
  { icon: "notifications-outline", label: "Notifications",          color: COLORS.info,    action: "Notifications" },
  { icon: "language-outline",    label: "Language: Urdu / English", color: COLORS.success, action: "Language" },
  { icon: "moon-outline",        label: "Appearance",               color: "#A78BFA",      action: "Appearance" },
  { icon: "help-circle-outline", label: "Help & Support",           color: COLORS.warning, action: "HelpSupport" },
];

export default function ProfileScreen({ navigation }) {
  const { userProfile, signOut } = useAuth();
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const initials = userProfile?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <Animated.View style={[styles.profileHeader, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
          <LinearGradient colors={[COLORS.primary, "#8B5CF6"]} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>

          <Text style={styles.userName}>{userProfile?.name || "User"}</Text>
          <Text style={styles.userEmail}>{userProfile?.email || ""}</Text>

          <View style={styles.roleBadge}>
            <Ionicons name="person-outline" size={12} color={COLORS.primary} />
            <Text style={styles.roleText}>Service Seeker</Text>
          </View>
        </Animated.View>

        {/* AI Tech Stack */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Infrastructure</Text>
          <View style={styles.techCard}>
            {FEATURES.map((f, i) => (
              <View key={i} style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureRowBorder]}>
                <View style={styles.featureIconBox}>
                  <Ionicons name={f.icon} size={16} color={COLORS.primary} />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
                {f.badge && (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeBadgeText}>{f.badge}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Hackathon Info */}
        <LinearGradient colors={["#12123A", "#0D0D28"]} style={styles.hackathonCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.hackathonHeader}>
            <Text style={styles.hackathonTitle}>Google Antigravity Hackathon</Text>
            <View style={styles.geminiChip}>
              <Text style={styles.geminiChipText}>✦ Groq</Text>
            </View>
          </View>
          <Text style={styles.hackathonSub}>Al Seekho Phase II · Challenge 2</Text>
          <Text style={styles.hackathonDesc}>
            Intelligent Service Provider Matching & Agentic Booking — powered by Groq function-calling for dynamic agent orchestration.
          </Text>
          <View style={styles.statsRow}>
            {[["5", "Agents"], ["50+", "Providers"], ["3", "Cities"]].map(([val, label]) => (
              <View key={label} style={styles.hackStat}>
                <Text style={styles.hackStatVal}>{val}</Text>
                <Text style={styles.hackStatLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
                onPress={() => navigation.navigate(item.action)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon} size={17} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={15} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>ServiceAI v2.0 · Build 2026</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 48 },

  profileHeader: { alignItems: "center", marginBottom: 28 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...SHADOWS.glow,
  },
  avatarText: { fontSize: 30, ...FONTS.bold, color: "#fff" },
  userName: { fontSize: 22, ...FONTS.extraBold, color: COLORS.text, marginBottom: 4 },
  userEmail: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + "44",
  },
  roleText: { fontSize: 12, color: COLORS.primary, ...FONTS.semiBold },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    ...FONTS.bold,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  techCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  featureIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  featureInfo: { flex: 1 },
  featureLabel: { fontSize: 13, ...FONTS.semiBold, color: COLORS.text, marginBottom: 2 },
  featureDesc: { fontSize: 11, color: COLORS.textMuted },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.successGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.success + "44",
  },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.success },
  activeBadgeText: { fontSize: 10, color: COLORS.success, ...FONTS.semiBold },

  hackathonCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + "33",
    ...SHADOWS.glow,
  },
  hackathonHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  hackathonTitle: { fontSize: 14, ...FONTS.bold, color: COLORS.text, flex: 1 },
  geminiChip: {
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primary + "44",
  },
  geminiChipText: { fontSize: 10, color: COLORS.primary, ...FONTS.semiBold },
  hackathonSub: { fontSize: 11, color: COLORS.primary, marginBottom: 10 },
  hackathonDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 16 },
  statsRow: { flexDirection: "row" },
  hackStat: { flex: 1, alignItems: "center" },
  hackStatVal: { fontSize: 20, ...FONTS.extraBold, color: COLORS.text, marginBottom: 2 },
  hackStatLabel: { fontSize: 11, color: COLORS.textMuted },

  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, color: COLORS.text, ...FONTS.medium },
  soonBadge: {
    fontSize: 9,
    color: COLORS.textMuted,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },

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
    marginBottom: 16,
  },
  signOutText: { fontSize: 15, color: COLORS.danger, ...FONTS.semiBold },
  version: { fontSize: 11, color: COLORS.textMuted, textAlign: "center" },
});
