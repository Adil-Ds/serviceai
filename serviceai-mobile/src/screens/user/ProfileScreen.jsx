import React, { useRef, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API } from "../../services/api";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";

const MENU_ITEMS = [
  { icon: "receipt-outline", label: "Booking History", color: COLORS.primary, action: "BookingHistory" },
  { icon: "notifications-outline", label: "Notifications", color: COLORS.info, action: "Notifications" },
  { icon: "language-outline", label: "Language: Urdu / English", color: COLORS.success, action: "Language" },
  { icon: "moon-outline", label: "Appearance", color: "#A78BFA", action: "Appearance" },
  { icon: "help-circle-outline", label: "Help & Support", color: COLORS.warning, action: "HelpSupport" },
];

export default function ProfileScreen({ navigation }) {
  const { userProfile, signOut } = useAuth();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [bookingCount, setBookingCount] = useState(12);
  const [pendingCount, setPendingCount] = useState(2);
  const [completedCount, setCompletedCount] = useState(10);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Dynamically load stats from DB
    const fetchStats = async () => {
      try {
        const data = await API.getAllBookings(userProfile?.uid);
        if (data) {
          setBookingCount(data.length);
          const pending = data.filter(b => b.status === "PENDING" || b.status === "pending").length;
          setPendingCount(pending);
          setCompletedCount(data.length - pending);
        }
      } catch (_) { }
    };
    fetchStats();
  }, [userProfile]);

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
        <Animated.View style={[
          styles.profileHeader,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }]
          }
        ]}>
          <LinearGradient colors={[COLORS.primary, "#8B5CF6"]} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>

          <Text style={styles.userName}>{userProfile?.name || "User"}</Text>
          <Text style={styles.userEmail}>{userProfile?.email || ""}</Text>

          <View style={styles.roleRow}>
            <View style={styles.roleBadge}>
              <Ionicons name="person-outline" size={11} color={COLORS.primary} />
              <Text style={styles.roleText}>Service Seeker</Text>
            </View>
            <View style={styles.vipBadge}>
              <Ionicons name="crown" size={11} color="#FBBF24" />
              <Text style={styles.vipText}>PREMIUM</Text>
            </View>
          </View>
        </Animated.View>

        {/* Dynamic Statistics Bar */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{bookingCount}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: COLORS.warning }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Active Inquiries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: COLORS.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Dispatches</Text>
          </View>
        </View>

        {/* Account Details Bento Box */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Ionicons name="call-outline" size={16} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>+92 300 4567890</Text>
              </View>
            </View>

            <View style={styles.detailRowBorder} />

            <View style={styles.detailRowBorder} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Member Since</Text>
                <Text style={styles.detailValue}>May 2026</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings & Preferences</Text>
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

        <Text style={styles.version}>ServiceAI v2.0 · Build 2026 · All Rights Reserved</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 48 },

  profileHeader: { alignItems: "center", marginBottom: 20 },
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

  roleRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.primary + "33",
  },
  roleText: { fontSize: 11, color: COLORS.primary, ...FONTS.semiBold },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  vipText: { fontSize: 10, color: "#FBBF24", ...FONTS.bold, letterSpacing: 0.5 },

  statsCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 20, ...FONTS.extraBold, color: COLORS.text, marginBottom: 2 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },
  statDivider: { width: 1, height: 24, backgroundColor: COLORS.border },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    ...FONTS.bold,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  detailCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  detailRowBorder: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 12 },
  detailIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  detailInfo: { flex: 1 },
  detailLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginBottom: 2 },
  detailValue: { fontSize: 13, ...FONTS.semiBold, color: COLORS.text },

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
  version: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    textAlign: "center",
    letterSpacing: 0.6,
    fontWeight: "700",
    marginTop: 8,
    textTransform: "uppercase",
    opacity: 0.7
  },
});
