import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";

const VARIANTS = {
  success: { bg: COLORS.successGlow, border: COLORS.success + "55", text: COLORS.success },
  warning: { bg: COLORS.warningGlow, border: COLORS.warning + "55", text: COLORS.warning },
  danger: { bg: COLORS.dangerGlow, border: COLORS.danger + "55", text: COLORS.danger },
  primary: { bg: COLORS.primaryGlow, border: COLORS.primary + "55", text: COLORS.primary },
  info: { bg: COLORS.infoGlow, border: COLORS.info + "55", text: COLORS.info },
  neutral: { bg: COLORS.card, border: COLORS.border, text: COLORS.textSecondary },
  provider: { bg: COLORS.providerGlow, border: COLORS.provider + "55", text: COLORS.provider },
};

export default function Badge({ label, variant = "primary", icon, size = "sm", style }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isLg = size === "lg";
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, isLg && styles.badgeLg, style]}>
      {icon ? <Text style={[styles.icon, isLg && styles.iconLg]}>{icon}</Text> : null}
      <Text style={[styles.label, { color: v.text }, isLg && styles.labelLg]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }) {
  const map = {
    CONFIRMED: { label: "Confirmed", variant: "success", icon: "✓" },
    PENDING: { label: "Pending", variant: "warning", icon: "⏳" },
    CANCELLED: { label: "Cancelled", variant: "danger", icon: "✕" },
  };
  const cfg = map[status] || { label: status, variant: "neutral", icon: null };
  return <Badge {...cfg} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeLg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  icon: { fontSize: 10 },
  iconLg: { fontSize: 13 },
  label: { fontSize: 11, ...FONTS.semiBold },
  labelLg: { fontSize: 13 },
});
