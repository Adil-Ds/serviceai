import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

const APPEARANCE_KEY = "@serviceai_appearance";

const THEMES = [
  { key: "dark",  label: "Dark",   icon: "moon",         desc: "Easy on the eyes at night" },
  { key: "light", label: "Light",  icon: "sunny",        desc: "Bright and clean interface" },
  { key: "auto",  label: "System", icon: "phone-portrait", desc: "Follow device setting" },
];

export default function AppearanceScreen() {
  const { theme: activeTheme, setTheme: applyTheme } = useTheme();
  const [theme,         setThemeLocal]  = useState(activeTheme);
  const [compactMode,   setCompactMode] = useState(false);
  const [animationsOn,  setAnimationsOn] = useState(true);

  useEffect(() => {
    setThemeLocal(activeTheme);
    AsyncStorage.getItem(APPEARANCE_KEY)
      .then((val) => {
        if (val) {
          const saved = JSON.parse(val);
          if (saved.compactMode  != null) setCompactMode(saved.compactMode);
          if (saved.animationsOn != null) setAnimationsOn(saved.animationsOn);
        }
      })
      .catch(() => {});
  }, [activeTheme]);

  const save = async (patch) => {
    const next = { theme, compactMode, animationsOn, ...patch };
    if (patch.theme != null) {
      setThemeLocal(patch.theme);
      applyTheme(patch.theme);  // live update via ThemeContext
    }
    if (patch.compactMode  != null) setCompactMode(patch.compactMode);
    if (patch.animationsOn != null) setAnimationsOn(patch.animationsOn);
    try {
      await AsyncStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
    } catch (_) {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="moon-outline" size={28} color="#A78BFA" />
          </View>
          <Text style={styles.heroTitle}>Appearance</Text>
          <Text style={styles.heroSub}>Customize how ServiceAI looks on your device</Text>
        </View>

        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.themeRow}>
          {THEMES.map((t) => {
            const active = theme === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.themeCard, active && styles.themeCardActive]}
                onPress={() => save({ theme: t.key })}
                activeOpacity={0.8}
              >
                <Ionicons name={active ? t.icon : t.icon + "-outline"} size={22} color={active ? "#A78BFA" : COLORS.textMuted} />
                <Text style={[styles.themeLabel, active && { color: "#A78BFA" }]}>{t.label}</Text>
                <Text style={styles.themeDesc}>{t.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Display Options</Text>
        <View style={styles.optionCard}>
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryGlow }]}>
                <Ionicons name="resize-outline" size={16} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.optionLabel}>Compact Mode</Text>
                <Text style={styles.optionSub}>Reduce padding and card sizes</Text>
              </View>
            </View>
            <Switch
              value={compactMode}
              onValueChange={(v) => save({ compactMode: v })}
              trackColor={{ false: COLORS.border, true: COLORS.primary + "88" }}
              thumbColor={compactMode ? COLORS.primary : COLORS.textMuted}
            />
          </View>

          <View style={[styles.optionRow, styles.optionRowBorder]}>
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: "#A78BFA18" }]}>
                <Ionicons name="sparkles-outline" size={16} color="#A78BFA" />
              </View>
              <View>
                <Text style={styles.optionLabel}>Animations</Text>
                <Text style={styles.optionSub}>Enable screen transitions and effects</Text>
              </View>
            </View>
            <Switch
              value={animationsOn}
              onValueChange={(v) => save({ animationsOn: v })}
              trackColor={{ false: COLORS.border, true: COLORS.primary + "88" }}
              thumbColor={animationsOn ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
          <Text style={styles.noteText}>
            Theme changes apply instantly. The dark theme is optimized for the AI pipeline display.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20 },

  heroCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    padding: 24, alignItems: "center", marginBottom: 24,
    borderWidth: 1, borderColor: "#A78BFA33",
  },
  heroIcon: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: "#A78BFA18", alignItems: "center", justifyContent: "center",
    marginBottom: 14, borderWidth: 1, borderColor: "#A78BFA44",
  },
  heroTitle: { fontSize: 20, ...FONTS.extraBold, color: COLORS.text, marginBottom: 6 },
  heroSub:   { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },

  sectionTitle: {
    fontSize: 11, ...FONTS.bold, color: COLORS.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12,
  },

  themeRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  themeCard: {
    flex: 1, alignItems: "center", gap: 6,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  themeCardActive: { borderColor: "#A78BFA66", backgroundColor: "#A78BFA10" },
  themeLabel: { fontSize: 13, ...FONTS.semiBold, color: COLORS.text },
  themeDesc:  { fontSize: 10, color: COLORS.textMuted, textAlign: "center" },

  optionCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: "hidden", marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", padding: 14,
  },
  optionRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  optionIcon: {
    width: 34, height: 34, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  optionLabel: { fontSize: 14, ...FONTS.medium, color: COLORS.text, marginBottom: 2 },
  optionSub:   { fontSize: 11, color: COLORS.textMuted },

  noteCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: 14, borderWidth: 1, borderColor: COLORS.info + "33",
  },
  noteText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, flex: 1 },
});
