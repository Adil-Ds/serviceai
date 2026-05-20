import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";
import { Pill } from "../../components/ui/SharedUI";

export default function SplashScreen({ onDone }) {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const ring0 = useRef(new Animated.Value(0.3)).current;
  const ring1 = useRef(new Animated.Value(0.3)).current;
  const ring2 = useRef(new Animated.Value(0.3)).current;
  const ring0Op = useRef(new Animated.Value(0.8)).current;
  const ring1Op = useRef(new Animated.Value(0.8)).current;
  const ring2Op = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 10 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    Animated.sequence([Animated.delay(300), Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true })]).start();
    Animated.sequence([Animated.delay(600), Animated.timing(pillOpacity, { toValue: 1, duration: 400, useNativeDriver: true })]).start();
    Animated.timing(barWidth, { toValue: 1, duration: 2200, useNativeDriver: false }).start();

    const makeRing = (scale, opacity, delay) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 3.5, duration: 2600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 2600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.3, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
      ]));
    makeRing(ring0, ring0Op, 0).start();
    makeRing(ring1, ring1Op, 600).start();
    makeRing(ring2, ring2Op, 1200).start();

    Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ])).start();

    const t = setTimeout(() => onDone && onDone(), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      {[ring0, ring1, ring2].map((r, i) => (
        <Animated.View key={i} style={[styles.ring, {
          opacity: [ring0Op, ring1Op, ring2Op][i],
          transform: [{ scale: r }],
        }]} />
      ))}

      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: Animated.multiply(logoScale, breathe) }] }}>
        <LinearGradient colors={[COLORS.primary, COLORS.violet, COLORS.pink]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBox}>
          <Ionicons name="sparkles" size={42} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, alignItems: "center", marginTop: 24 }}>
        <Text style={styles.brand}>ServiceAI</Text>
        <Text style={styles.tagline}>AGENT · BOOK · DONE</Text>
      </Animated.View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, {
          width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }]} />
      </View>

      <Animated.View style={{ position: "absolute", bottom: 36, opacity: pillOpacity }}>
        <Pill color={COLORS.violet} icon="flash-outline">POWERED BY GEMINI</Pill>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute", width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderColor: COLORS.primary,
  },
  logoBox: {
    width: 96, height: 96, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    shadowColor: COLORS.primary, shadowOpacity: 0.6, shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 }, elevation: 16,
  },
  brand: { fontSize: 32, fontWeight: "900", letterSpacing: -0.8, color: COLORS.text },
  tagline: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, letterSpacing: 2 },
  barTrack: {
    position: "absolute", bottom: 72, left: 60, right: 60,
    height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 2 },
});
