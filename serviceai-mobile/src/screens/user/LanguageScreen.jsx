import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";

const LANGUAGES = [
  {
    code: "en",
    name: "English",
    native: "English",
    icon: "🇬🇧",
    desc: "App interface and AI responses in English",
  },
  {
    code: "ur",
    name: "Urdu",
    native: "اردو",
    icon: "🇵🇰",
    desc: "آپ اردو میں سروس تلاش کر سکتے ہیں",
  },
];

const LANG_KEY = "@serviceai_language";

export default function LanguageScreen() {
  const [selected, setSelected] = useState("en");
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((val) => { if (val) setSelected(val); })
      .catch(() => {});
  }, []);

  const handleSelect = async (code) => {
    if (code === selected) return;
    setSaving(true);
    try {
      await AsyncStorage.setItem(LANG_KEY, code);
      setSelected(code);
      const lang = LANGUAGES.find((l) => l.code === code);
      Alert.alert(
        "Language Updated",
        `Language set to ${lang?.name}. Restart the app to apply changes fully.`,
        [{ text: "OK" }]
      );
    } catch (_) {
      Alert.alert("Error", "Could not save language preference.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="language-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Language</Text>
          <Text style={styles.heroSub}>Choose your preferred language for the app</Text>
        </View>

        <Text style={styles.sectionTitle}>Available Languages</Text>

        {LANGUAGES.map((lang) => {
          const active = selected === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langCard, active && styles.langCardActive]}
              onPress={() => handleSelect(lang.code)}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Text style={styles.langFlag}>{lang.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.langNameRow}>
                  <Text style={[styles.langName, active && { color: COLORS.primary }]}>{lang.name}</Text>
                  <Text style={styles.langNative}>{lang.native}</Text>
                </View>
                <Text style={styles.langDesc}>{lang.desc}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
          <Text style={styles.noteText}>
            ServiceAI supports Urdu and English input for service requests. You can type in either language regardless of this setting.
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
    borderWidth: 1, borderColor: COLORS.primary + "33",
  },
  heroIcon: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: COLORS.primaryGlow, alignItems: "center", justifyContent: "center",
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.primary + "44",
  },
  heroTitle: { fontSize: 20, ...FONTS.extraBold, color: COLORS.text, marginBottom: 6 },
  heroSub:   { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },

  sectionTitle: {
    fontSize: 11, ...FONTS.bold, color: COLORS.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12,
  },

  langCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  langCardActive: { borderColor: COLORS.primary + "66", backgroundColor: COLORS.primaryGlow },
  langFlag:  { fontSize: 28 },
  langNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  langName:  { fontSize: 15, ...FONTS.semiBold, color: COLORS.text },
  langNative: { fontSize: 14, color: COLORS.textMuted },
  langDesc:  { fontSize: 12, color: COLORS.textSecondary },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: COLORS.primary },
  radioDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary,
  },

  noteCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: COLORS.info + "33",
  },
  noteText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, flex: 1 },
});
