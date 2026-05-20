import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../../constants/theme";
import { Pill, SpringIn } from "../../components/ui/SharedUI";

const FEATURES = [
  { icon: "sparkles-outline", text: "Describe needs in Urdu or English",  color: COLORS.info },
  { icon: "hardware-chip-outline", text: "5 AI agents find your perfect match", color: COLORS.primary },
  { icon: "flash-outline", text: "Booked & confirmed in under 60s",     color: COLORS.success },
];

const ROLES = [
  { role: "user", title: "Service Seeker", sub: "Find plumbers, doctors, tutors near you", color: COLORS.primary, icon: "person-outline" },
  { role: "provider", title: "Service Provider", sub: "Get AI-matched bookings to your inbox", color: COLORS.warning, icon: "construct-outline" },
];

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(108,99,255,0.25)", COLORS.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pill color={COLORS.success} icon="radio-button-on-outline" size="sm">REAL-TIME</Pill>
            <Text style={styles.headline}>
              Find any service{"\n"}
              <Text style={styles.headlineGrad}>in seconds.</Text>
            </Text>
            <Text style={styles.sub}>AI agents that listen, search, rank, and book — all from one message.</Text>

            <View style={{ marginTop: 22, gap: 8 }}>
              {FEATURES.map((f, i) => (
                <SpringIn key={i} delay={i * 80}>
                  <View style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: f.color + "22", borderColor: f.color + "55" }]}>
                      <Ionicons name={f.icon} size={17} color={f.color} />
                    </View>
                    <Text style={styles.featureText}>{f.text}</Text>
                  </View>
                </SpringIn>
              ))}
            </View>
          </View>

          <View style={styles.rolePicker}>
            <Text style={styles.roleLabel}>I AM A...</Text>
            {ROLES.map((r, i) => (
              <SpringIn key={r.role} delay={300 + i * 80}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Login", { role: r.role })}
                  style={styles.roleBtn}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[r.color, r.color + "BB"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.roleIconBox}
                  >
                    <Ionicons name={r.icon} size={22} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleTitle}>{r.title}</Text>
                    <Text style={styles.roleSub}>{r.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </SpringIn>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: "space-between", paddingBottom: 20 },
  header: { padding: 24, paddingTop: 16 },
  headline: { fontSize: 32, fontWeight: "900", letterSpacing: -1.2, color: COLORS.text, marginTop: 12, marginBottom: 8, lineHeight: 36 },
  headlineGrad: { color: COLORS.primary },
  sub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  featureRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  featureIcon: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  featureText: { fontSize: 13, color: COLORS.text, fontWeight: "600", flex: 1 },
  rolePicker: { padding: 20, gap: 10 },
  roleLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 1.5, marginBottom: 4 },
  roleBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 14,
  },
  roleIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  roleTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  roleSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
