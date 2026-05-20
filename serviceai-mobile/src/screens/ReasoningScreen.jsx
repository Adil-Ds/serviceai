import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  Animated, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FONTS, RADIUS } from "../constants/theme";

const AGENT_NAMES = [
  { n: 1, name: "Intent Parser", icon: "🧠" },
  { n: 2, name: "Provider Search", icon: "🔍" },
  { n: 3, name: "Ranking Engine", icon: "📊" },
];

export default function ReasoningScreen({ route, navigation }) {
  const { result, userText } = route.params;
  const [visibleSteps, setVisibleSteps] = useState([]);
  const fadeAnims = useRef(AGENT_NAMES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Animate steps appearing one by one
    AGENT_NAMES.forEach((_, i) => {
      setTimeout(() => {
        setVisibleSteps((prev) => [...prev, i]);
        Animated.timing(fadeAnims[i], {
          toValue: 1, duration: 400, useNativeDriver: true,
        }).start();
      }, i * 900);
    });
  }, []);

  const allDone = visibleSteps.length === AGENT_NAMES.length;
  const ranked = result?.ranked_providers || [];
  const intent = result?.intent;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Text style={styles.title}>🤖 AI Agents Working</Text>
        <Text style={styles.sub}>"{userText}"</Text>

        {/* Intent summary card */}
        {intent && (
          <View style={styles.intentCard}>
            <Text style={styles.intentRow}>
              <Text style={styles.intentLabel}>Service: </Text>
              <Text style={styles.intentValue}>{intent.service_category?.replace("_", " ")} </Text>
            </Text>
            <Text style={styles.intentRow}>
              <Text style={styles.intentLabel}>Location: </Text>
              <Text style={styles.intentValue}>{intent.area}, {intent.city}</Text>
            </Text>
            <Text style={styles.intentRow}>
              <Text style={styles.intentLabel}>Date: </Text>
              <Text style={styles.intentValue}>{intent.date}</Text>
            </Text>
            {intent.budget_max_pkr && (
              <Text style={styles.intentRow}>
                <Text style={styles.intentLabel}>Budget: </Text>
                <Text style={styles.intentValue}>₨{intent.budget_max_pkr}</Text>
              </Text>
            )}
            <View style={[styles.urgencyBadge,
              intent.urgency === "emergency" ? styles.urgencyRed : styles.urgencyGreen]}>
              <Text style={styles.urgencyText}>
                {intent.urgency === "emergency" ? "🚨 EMERGENCY" : `⏰ ${intent.urgency?.toUpperCase()}`}
              </Text>
            </View>
          </View>
        )}

        {/* Agent steps */}
        <View style={styles.stepsCard}>
          {AGENT_NAMES.map((agent, i) => {
            const step = result?.agent_steps?.find((s) => s.agent === agent.n);
            const visible = visibleSteps.includes(i);
            return (
              <Animated.View key={i} style={[styles.step, { opacity: fadeAnims[i] }]}>
                <View style={[styles.stepDot, visible ? styles.stepDotActive : styles.stepDotIdle]} />
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {agent.icon} Agent {agent.n}: {agent.name}
                    {visible ? " ✅" : " ⏳"}
                  </Text>
                  {visible && step && (
                    <Text style={styles.stepSummary}>{step.summary}</Text>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* CTA */}
        {allDone && ranked.length > 0 && (
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.navigate("Results", { ranked, intent })}
          >
            <Text style={styles.btnText}>
              View {ranked.length} Providers →
            </Text>
          </TouchableOpacity>
        )}

        {allDone && ranked.length === 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              No providers found matching your criteria. Try a different area or remove budget limit.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, ...FONTS.bold, color: COLORS.text, marginBottom: 6 },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20, fontStyle: "italic" },
  intentCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.primary + "44",
  },
  intentRow: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  intentLabel: { color: COLORS.textSecondary },
  intentValue: { ...FONTS.semiBold },
  urgencyBadge: { marginTop: 8, borderRadius: RADIUS.sm, paddingVertical: 4, paddingHorizontal: 10, alignSelf: "flex-start" },
  urgencyRed: { backgroundColor: COLORS.danger + "33" },
  urgencyGreen: { backgroundColor: COLORS.success + "22" },
  urgencyText: { fontSize: 12, ...FONTS.semiBold, color: COLORS.text },
  stepsCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  step: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  stepDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  stepDotActive: { backgroundColor: COLORS.success },
  stepDotIdle: { backgroundColor: COLORS.border },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, color: COLORS.text, ...FONTS.semiBold, marginBottom: 2 },
  stepSummary: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 16, alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16, ...FONTS.semiBold },
  noResults: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 16, borderWidth: 1, borderColor: COLORS.danger + "44",
  },
  noResultsText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
});
