import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Animated, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../../constants/theme";
import { TopBar, Pill, SpringIn } from "../../components/ui/SharedUI";

const SUGGESTIONS = [
  "AC not cooling in living room, need urgent help",
  "Need a math tutor for class 9 algebra near Saba Avenue",
  "Pipe burst in bathroom, emergency plumber needed now",
  "Electrician for fan installation, weekend okay",
  "Doctor for elderly mother with high fever, Gulshan",
  "House cleaner for deep cleaning this weekend",
];

export default function SearchScreen({ navigation, route }) {
  const prefill = route?.params?.prefill || "";
  const [query, setQuery] = useState(prefill);
  const [lang, setLang] = useState("EN");
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    if (prefill) setQuery(prefill);
  }, [prefill]);

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 240, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    navigation.navigate("Reasoning", { query: query.trim() });
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primary],
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <TopBar
          title="Ask anything"
          subtitle="AI agents will find it"
          onBack={() => navigation.goBack()}
          right={
            <TouchableOpacity
              onPress={() => setLang(l => l === "EN" ? "UR" : "EN")}
              style={styles.langBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="globe-outline" size={12} color={COLORS.primary} />
              <Text style={styles.langText}>{lang === "EN" ? "EN · اردو" : "اردو · EN"}</Text>
            </TouchableOpacity>
          }
        />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Glowing textarea */}
            <Animated.View style={[styles.textareaOuter, { borderColor }]}>
              <View style={styles.textareaInner}>
                {/* AI-ready badge */}
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles-outline" size={11} color={COLORS.violet} />
                  <Text style={styles.aiBadgeText}>AI-READY</Text>
                </View>

                <TextInput
                  ref={inputRef}
                  value={query}
                  onChangeText={setQuery}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder={lang === "EN" ? "Describe what you need..." : "اپنی ضرورت بتائیں..."}
                  placeholderTextColor={COLORS.textDim}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[styles.textarea, lang === "UR" && { textAlign: "right" }]}
                />

                {/* Toolbar */}
                <View style={styles.toolbar}>
                  <TouchableOpacity style={styles.toolBtn}><Ionicons name="mic-outline" size={14} color={COLORS.textSecondary} /></TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn}><Ionicons name="location-outline" size={14} color={COLORS.textSecondary} /></TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn}><Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} /></TouchableOpacity>
                  <Text style={styles.charCount}>{query.length} chars · Google Maps search</Text>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!query.trim()}
                    activeOpacity={0.85}
                    style={[styles.askBtn, !query.trim() && { opacity: 0.4 }]}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.violet]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.askBtnGrad}
                    >
                      <Ionicons name="arrow-forward" size={13} color="#fff" />
                      <Text style={styles.askBtnText}>Ask AI</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            {/* Suggestions */}
            <Text style={styles.suggestLabel}>TRY ONE OF THESE</Text>
            <View style={{ gap: 8 }}>
              {SUGGESTIONS.map((s, i) => (
                <SpringIn key={i} delay={i * 70}>
                  <TouchableOpacity onPress={() => setQuery(s)} style={styles.suggestion} activeOpacity={0.8}>
                    <Ionicons name="sparkles-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.suggestionText} numberOfLines={2}>{s}</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.textDim} />
                  </TouchableOpacity>
                </SpringIn>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 18, paddingTop: 8, paddingBottom: 40 },
  langBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.primary + "55",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  langText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
  textareaOuter: {
    borderWidth: 1.5, borderRadius: 22, marginTop: 6, marginBottom: 22,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  textareaInner: { padding: 16, paddingTop: 12 },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-end", marginBottom: 8,
  },
  aiBadgeText: { fontSize: 9, color: COLORS.violet, fontWeight: "700", letterSpacing: 1 },
  textarea: {
    color: COLORS.text, fontSize: 15, lineHeight: 22,
    minHeight: 90, paddingTop: 0,
  },
  toolbar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  toolBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center",
  },
  charCount: { flex: 1, fontSize: 10, color: COLORS.textMuted, marginLeft: 6 },
  askBtn: { borderRadius: 12, overflow: "hidden" },
  askBtnGrad: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  askBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  suggestLabel: {
    fontSize: 10, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 1.4, marginBottom: 10,
  },
  suggestion: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  suggestionText: { flex: 1, fontSize: 12.5, color: COLORS.textSecondary },
});
