import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";
import { API } from "../../services/api";

// try-require expo-location (not available on web)
let Location = null;
try { Location = require("expo-location"); } catch (_) { }

async function tryGetCoords() {
  if (!Location) return null;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    
    // Force active satellite-based GPS tracking instead of coarse cell towers/wifi
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    try {
      // Fallback if device satellite lock fails or is restricted
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { return null; }
  }
}

function cleanAdmin(s) {
  return (s || "").replace(/\s+(District|Division|Tehsil|City)$/i, "").trim();
}

async function reverseGeocode(lat, lng) {
  // 1. Try Native System Geocoder first (highly precise in Pakistan/Lahore)
  if (Location) {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results.length > 0) {
        const addr = results[0];
        
        // Assemble high-fidelity detailed street/house-level components
        const parts = [];
        if (addr.name && addr.name !== addr.street && addr.name !== addr.district) {
          parts.push(addr.name);
        }
        if (addr.street && addr.street !== addr.district) {
          parts.push(addr.street);
        }
        if (addr.district) {
          parts.push(addr.district);
        }
        if (addr.subregion && addr.subregion !== addr.city) {
          parts.push(addr.subregion);
        }
        if (addr.city) {
          parts.push(addr.city);
        }
        
        const display = parts.filter(Boolean).join(", ");
        if (display) {
          return { city: addr.city || "Lahore", area: addr.district || "", display };
        }
      }
    } catch (e) {
      console.log("[reverseGeocode] Native geocoder failed on ReasoningScreen, trying Nominatim fallback...", e);
    }
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en&zoom=14`,
      { headers: { "User-Agent": "ServiceAI/1.0" } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const city = cleanAdmin(addr.city || addr.district || addr.county || addr.town || "Karachi");
    const area = addr.neighbourhood || addr.suburb || addr.quarter || addr.town || "";
    return { city, area, display: [area, city].filter(Boolean).join(", ") };
  } catch { return { city: "Karachi", area: "", display: "Karachi" }; }
}

const PHASES = [
  { key: "parsing", icon: "text-outline", label: "Reading your request", sub: "Extracting service & location..." },
  { key: "locating", icon: "location-outline", label: "Detecting your location", sub: "Reverse geocoding GPS coordinates..." },
  { key: "searching", icon: "search-outline", label: "Searching Google Maps", sub: "Scanning live business listings..." },
  { key: "ranking", icon: "podium-outline", label: "Ranking results", sub: "Scoring by rating, reviews & distance..." },
];

const TIPS = [
  "Scanning real Google Maps listings for you",
  "Results include live ratings & phone numbers",
  "AI scores each business by distance, rating & reviews",
  "Real businesses — verified by Google Maps data",
  "Ranking formula: Rating 40% · Reviews 30% · Distance 30%",
  "Closer providers with higher ratings rank first",
];

export default function ReasoningScreen({ navigation, route }) {
  const { query } = route.params || {};
  const [phaseKey, setPhaseKey] = useState("parsing");
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [locationText, setLocationText] = useState("Detecting...");
  const [error, setError] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Scale = useRef(new Animated.Value(0.4)).current;
  const ring2Scale = useRef(new Animated.Value(0.4)).current;
  const ring1Op = useRef(new Animated.Value(0.9)).current;
  const ring2Op = useRef(new Animated.Value(0.9)).current;
  const tipOpacity = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const tipRef = useRef(null);

  // Animations
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 1100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
    ])).start();

    const makeRing = (scale, opacity, delay) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 2.8, duration: 2600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 2600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.9, duration: 0, useNativeDriver: true }),
        ]),
      ]));
    makeRing(ring1Scale, ring1Op, 0).start();
    makeRing(ring2Scale, ring2Op, 1000).start();

    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    tipRef.current = setInterval(() => {
      Animated.timing(tipOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setTipIndex(i => (i + 1) % TIPS.length);
        Animated.timing(tipOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    }, 4000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(tipRef.current);
    };
  }, []);

  // Main search flow
  useEffect(() => {
    if (!query) return;
    const run = async () => {
      try {
        // Phase 1 — Parse intent to extract service keyword
        setPhaseKey("parsing");
        let service = query;
        try {
          const intent = await API.parseIntent(query);
          const cat = intent.service_category?.replace(/_/g, " ");
          if (cat) service = cat;
        } catch (_) { /* keep raw query */ }

        // Phase 2 — GPS + reverse geocode
        setPhaseKey("locating");
        let address = "Karachi";
        const coords = await tryGetCoords();
        if (coords) {
          const geo = await reverseGeocode(coords.lat, coords.lng);
          address = geo.display || geo.city || "Karachi";
        }
        setLocationText(address || "Karachi");

        // Phase 3 — Google Maps scrape
        setPhaseKey("searching");
        const result = await API.findBusiness(service, address);

        // Phase 4 — Brief ranking phase
        setPhaseKey("ranking");
        await new Promise(r => setTimeout(r, 700));

        clearInterval(timerRef.current);
        navigation.replace("Results", { findResult: result, query });
      } catch (e) {
        clearInterval(timerRef.current);
        setError(e.message || "Search failed. Please try again.");
      }
    };
    run();
  }, [query]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const currentPhase = PHASES.find(p => p.key === phaseKey) || PHASES[2];
  const phaseIndex = PHASES.findIndex(p => p.key === phaseKey);

  if (error) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <Ionicons name="alert-circle-outline" size={52} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Search Failed</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>← Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(108,99,255,0.14)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.5 }}
      />
      <SafeAreaView style={styles.safe}>

        {/* Back button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Center: radar orb */}
        <View style={styles.orbWrap}>
          <Animated.View style={[styles.ring, { opacity: ring1Op, transform: [{ scale: ring1Scale }] }]} />
          <Animated.View style={[styles.ring, { opacity: ring2Op, transform: [{ scale: ring2Scale }] }]} />
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.violet]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.orb}
            >
              <Ionicons name={currentPhase.icon} size={32} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Phase label */}
        <View style={styles.phaseWrap}>
          <Text style={styles.phaseLabel}>{currentPhase.label}</Text>
          <Text style={styles.phaseSub}>{currentPhase.sub}</Text>
        </View>

        {/* Step dots */}
        <View style={styles.dotsRow}>
          {PHASES.map((p, i) => (
            <View key={p.key} style={[
              styles.dot,
              i < phaseIndex && { backgroundColor: COLORS.success, width: 8, height: 8 },
              i === phaseIndex && { backgroundColor: COLORS.primary, width: 20, borderRadius: 4 },
              i > phaseIndex && { backgroundColor: COLORS.border },
            ]} />
          ))}
        </View>

        {/* Location detected */}
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.success} />
          <Text style={styles.locText} numberOfLines={1}>{locationText}</Text>
        </View>

        {/* Elapsed time */}
        <View style={styles.timerRow}>
          <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          {phaseKey === "searching" && (
            <Text style={styles.timerEst}> · est. 3-5 min</Text>
          )}
        </View>

        {/* Rotating tip */}
        <Animated.View style={[styles.tipBox, { opacity: tipOpacity }]}>
          <Ionicons name="information-circle-outline" size={13} color={COLORS.primary} />
          <Text style={styles.tipText}>{TIPS[tipIndex]}</Text>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1, alignItems: "center", justifyContent: "center" },

  backBtn: {
    position: "absolute",
    top: 16, left: 16,
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },

  orbWrap: { alignItems: "center", justifyContent: "center", marginBottom: 36 },
  ring: {
    position: "absolute",
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: COLORS.primary,
  },
  orb: {
    width: 92, height: 92, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: COLORS.primary, shadowOpacity: 0.6, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }, elevation: 14,
  },

  phaseWrap: { alignItems: "center", marginBottom: 20 },
  phaseLabel: { fontSize: 18, fontWeight: "800", color: COLORS.text, letterSpacing: -0.4, marginBottom: 6 },
  phaseSub: { fontSize: 12, color: COLORS.textSecondary },

  dotsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },

  locRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.successGlow, borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.success + "44",
    marginBottom: 10, maxWidth: 260,
  },
  locText: { fontSize: 12, color: COLORS.success, fontWeight: "600", flex: 1 },

  timerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 28 },
  timerText: { fontSize: 12, color: COLORS.textMuted, fontFamily: "Courier New" },
  timerEst: { fontSize: 11, color: COLORS.textDim },

  tipBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, padding: 14, marginHorizontal: 32, maxWidth: 320,
  },
  tipText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  errorTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginTop: 16, marginBottom: 8 },
  errorMsg: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  retryBtn: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  retryText: { color: COLORS.primary, fontWeight: "700" },
});
