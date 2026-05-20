import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

// ── Dark palette (matches existing theme.js COLORS) ─────────────────────────
const DARK = {
  bg: "#070710",
  surface: "#0D0D1C",
  card: "#111127",
  cardAlt: "#161630",
  elevated: "#1A1A38",
  border: "#1E1E40",
  borderLight: "#2A2A55",
  primary: "#6C63FF",
  primaryDark: "#5549E8",
  primaryLight: "#8B85FF",
  primaryGlow: "rgba(108,99,255,0.12)",
  primaryGlowStrong: "rgba(108,99,255,0.25)",
  success: "#10D9A0",
  successDark: "#0CB888",
  successGlow: "rgba(16,217,160,0.12)",
  warning: "#F59E0B",
  warningGlow: "rgba(245,158,11,0.12)",
  danger: "#EF4444",
  dangerGlow: "rgba(239,68,68,0.12)",
  info: "#38BDF8",
  infoGlow: "rgba(56,189,248,0.12)",
  provider: "#F59E0B",
  providerGlow: "rgba(245,158,11,0.12)",
  text: "#EEEEFF",
  textSecondary: "#7878A8",
  textMuted: "#404068",
  textInverse: "#070710",
  textCode: "#A78BFA",
  gradientPrimary: ["#6C63FF", "#9B59B6"],
  gradientSuccess: ["#10D9A0", "#0CB888"],
  gradientProvider: ["#F59E0B", "#D97706"],
  gradientDark: ["#111127", "#070710"],
  gradientCard: ["#1A1A38", "#111127"],
  gradientDeep: ["#0D0D1C", "#070710"],
};

// ── Light palette ────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#F2F2FF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardAlt: "#F8F8FF",
  elevated: "#EFEFFF",
  border: "#E0E0F5",
  borderLight: "#CACAF0",
  primary: "#6C63FF",
  primaryDark: "#5549E8",
  primaryLight: "#8B85FF",
  primaryGlow: "rgba(108,99,255,0.10)",
  primaryGlowStrong: "rgba(108,99,255,0.20)",
  success: "#059669",
  successDark: "#047857",
  successGlow: "rgba(5,150,105,0.10)",
  warning: "#D97706",
  warningGlow: "rgba(217,119,6,0.10)",
  danger: "#DC2626",
  dangerGlow: "rgba(220,38,38,0.10)",
  info: "#0284C7",
  infoGlow: "rgba(2,132,199,0.10)",
  provider: "#D97706",
  providerGlow: "rgba(217,119,6,0.10)",
  text: "#1A1A2E",
  textSecondary: "#4A4A6A",
  textMuted: "#9090B8",
  textInverse: "#EEEEFF",
  textCode: "#7C3AED",
  gradientPrimary: ["#6C63FF", "#9B59B6"],
  gradientSuccess: ["#059669", "#047857"],
  gradientProvider: ["#D97706", "#B45309"],
  gradientDark: ["#FFFFFF", "#F2F2FF"],
  gradientCard: ["#FFFFFF", "#F8F8FF"],
  gradientDeep: ["#F8F8FF", "#F2F2FF"],
};

// React Navigation theme wrappers
const NAV_DARK = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: DARK.bg, card: DARK.surface, text: DARK.text, border: DARK.border, notification: DARK.primary },
};

const NAV_LIGHT = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: LIGHT.bg, card: LIGHT.surface, text: LIGHT.text, border: LIGHT.border, notification: LIGHT.primary },
};

// ── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext({
  theme: "dark",
  isDark: true,
  colors: DARK,
  navTheme: NAV_DARK,
  setTheme: () => {},
});

const STORAGE_KEY = "@serviceai_appearance";

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) {
          const prefs = JSON.parse(json);
          if (prefs.theme) setThemeState(prefs.theme);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = async (key) => {
    setThemeState(key);
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const prefs = json ? JSON.parse(json) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, theme: key }));
    } catch (_) {}
  };

  const resolvedTheme = theme === "auto" ? (systemScheme === "light" ? "light" : "dark") : theme;
  const isDark  = resolvedTheme === "dark";
  const colors  = isDark ? DARK : LIGHT;
  const navTheme = isDark ? NAV_DARK : NAV_LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, navTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
