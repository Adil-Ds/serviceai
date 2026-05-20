import React, { useRef, useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, FONTS, SHADOWS } from "../../constants/theme";

// ── GlassCard ────────────────────────────────────────────────────────────────
export function GlassCard({ children, style, glow, accent, onPress, padding = 14 }) {
  const borderColor = accent || COLORS.border;
  const shadowColor = glow || "#000";
  const card = (
    <View style={[
      styles.glassCard,
      { padding, borderColor, shadowColor },
      glow ? { shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 } : null,
      style,
    ]}>
      {children}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{card}</TouchableOpacity>;
  return card;
}

// ── PressButton ───────────────────────────────────────────────────────────────
export function PressButton({
  children, onPress, color = COLORS.primary, variant = "solid",
  size = "md", style, disabled, icon, iconRight, fullWidth = true,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  };
  const release = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  const sizes = {
    sm: { height: 36, paddingH: 14, fontSize: 12, radius: 11, iconSize: 14 },
    md: { height: 48, paddingH: 18, fontSize: 14, radius: 14, iconSize: 16 },
    lg: { height: 56, paddingH: 22, fontSize: 15, radius: 16, iconSize: 18 },
  };
  const s = sizes[size] || sizes.md;

  const inner = (
    <View style={[
      styles.btnInner,
      { height: s.height, paddingHorizontal: s.paddingH, borderRadius: s.radius },
      fullWidth && { width: "100%" },
    ]}>
      {icon && <Ionicons name={icon} size={s.iconSize} color={variant === "solid" ? "#fff" : color} style={{ marginRight: 6 }} />}
      <Text style={[styles.btnText, { fontSize: s.fontSize, color: variant === "solid" ? "#fff" : color }]}>
        {children}
      </Text>
      {iconRight && <Ionicons name={iconRight} size={s.iconSize} color={variant === "solid" ? "#fff" : color} style={{ marginLeft: 6 }} />}
    </View>
  );

  const containerStyle = [
    styles.btnContainer,
    fullWidth && { width: "100%" },
    { borderRadius: s.radius },
    disabled && { opacity: 0.4 },
    style,
  ];

  if (variant === "ghost") {
    return (
      <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
        <Pressable
          onPress={disabled ? null : onPress}
          onPressIn={press} onPressOut={release}
          style={[styles.btnBase, { borderRadius: s.radius, borderWidth: 1, borderColor: COLORS.border }]}
        >
          {inner}
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === "tonal") {
    return (
      <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
        <Pressable
          onPress={disabled ? null : onPress}
          onPressIn={press} onPressOut={release}
          style={[styles.btnBase, { borderRadius: s.radius, backgroundColor: color + "22", borderWidth: 1, borderColor: color + "44" }]}
        >
          {inner}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <LinearGradient
        colors={disabled ? [COLORS.card, COLORS.card] : [color, shadeColor(color, -15)]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.btnBase, { borderRadius: s.radius, shadowColor: color, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8 }]}
      >
        <Pressable onPress={disabled ? null : onPress} onPressIn={press} onPressOut={release} style={styles.btnPressable}>
          {inner}
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Pill ─────────────────────────────────────────────────────────────────────
export function Pill({ children, color = COLORS.primary, icon, size = "md", variant = "tonal", style }) {
  const fs = size === "sm" ? 9 : size === "lg" ? 12 : 10.5;
  const padY = size === "sm" ? 3 : 4;
  const padX = size === "sm" ? 7 : 9;
  return (
    <View style={[
      styles.pill,
      {
        paddingVertical: padY, paddingHorizontal: padX,
        backgroundColor: variant === "solid" ? color : color + "22",
        borderColor: variant === "solid" ? color : color + "55",
      },
      style,
    ]}>
      {icon && <Ionicons name={icon} size={fs + 1} color={variant === "solid" ? "#fff" : color} style={{ marginRight: 4 }} />}
      <Text style={[styles.pillText, { fontSize: fs, color: variant === "solid" ? "#fff" : color }]}>
        {children}
      </Text>
    </View>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    pending:   { color: COLORS.warning, label: "Pending",   icon: "time-outline" },
    PENDING:   { color: COLORS.warning, label: "Pending",   icon: "time-outline" },
    confirmed: { color: COLORS.success, label: "Confirmed", icon: "checkmark-outline" },
    CONFIRMED: { color: COLORS.success, label: "Confirmed", icon: "checkmark-outline" },
    cancelled: { color: COLORS.danger,  label: "Cancelled", icon: "close-outline" },
    CANCELLED: { color: COLORS.danger,  label: "Cancelled", icon: "close-outline" },
    completed: { color: COLORS.info,    label: "Completed", icon: "checkmark-circle-outline" },
    COMPLETED: { color: COLORS.info,    label: "Completed", icon: "checkmark-circle-outline" },
  };
  const s = map[status] || map.pending;
  return <Pill color={s.color} icon={s.icon} size="sm">{s.label}</Pill>;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name = "AS", size = 44, color = COLORS.primary, color2 }) {
  const initials = (name || "AS").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const c2 = color2 || shadeColor(color, -20);
  return (
    <LinearGradient
      colors={[color, c2]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </LinearGradient>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────
export function TopBar({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.topBar}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        {title && <Text style={styles.topBarTitle}>{title}</Text>}
        {subtitle && <Text style={styles.topBarSub}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

// ── LiveDot ───────────────────────────────────────────────────────────────────
export function LiveDot({ color = COLORS.success, size = 8 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: size + 6, height: size + 6, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{
        position: "absolute",
        width: size + 6, height: size + 6, borderRadius: (size + 6) / 2,
        backgroundColor: color + "44",
        transform: [{ scale: pulse }],
      }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

// ── ScoreBar ──────────────────────────────────────────────────────────────────
export function ScoreBar({ label, value, max = 100, color = COLORS.primary, delay = 0 }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(widthAnim, {
        toValue: (value / max) * 100,
        duration: 900, useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: COLORS.text, fontSize: 11, fontWeight: "700" }}>{value}</Text>
      </View>
      <View style={styles.scoreBarTrack}>
        <Animated.View style={[
          styles.scoreBarFill,
          {
            backgroundColor: color,
            shadowColor: color,
            width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
          },
        ]} />
      </View>
    </View>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────────────────
export function SectionTitle({ title, action, accent }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        {accent && <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: accent }} />}
        <Text style={styles.sectionTitleText}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ width = "100%", height = 14, radius = 6, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: COLORS.elevated, opacity }, style]} />
  );
}

// ── ThinkingDots ──────────────────────────────────────────────────────────────
export function ThinkingDots({ color = COLORS.textSecondary }) {
  const anims = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current);
  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{
          width: 5, height: 5, borderRadius: 2.5, backgroundColor: color,
          opacity: a,
          transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.2] }) }],
        }} />
      ))}
    </View>
  );
}

// ── Spring-in wrapper ─────────────────────────────────────────────────────────
export function SpringIn({ children, delay = 0, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }),
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 6 }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={[{ opacity: anim, transform: [{ translateY: translate }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
export function shadeColor(hex, percent) {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) + Math.round(255 * percent / 100);
  let g = ((n >> 8) & 0xff) + Math.round(255 * percent / 100);
  let b = (n & 0xff) + Math.round(255 * percent / 100);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: "rgba(17,17,39,0.92)",
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  btnContainer: { overflow: "hidden" },
  btnBase: { overflow: "hidden" },
  btnPressable: { flex: 1 },
  btnInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },
  btnText: { fontWeight: "700", letterSpacing: 0.2 },
  pill: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: RADIUS.full,
    alignSelf: "flex-start",
  },
  pillText: { fontWeight: "700", letterSpacing: 0.4 },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", letterSpacing: -0.3 },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "rgba(7,7,16,0.85)",
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  topBarTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  topBarSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  scoreBarTrack: {
    height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.border,
  },
  scoreBarFill: {
    height: "100%", borderRadius: 3,
    shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  sectionTitle: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 18, marginBottom: 10,
  },
  sectionTitleText: { fontSize: 14, fontWeight: "700", color: COLORS.text, letterSpacing: -0.2 },
});
