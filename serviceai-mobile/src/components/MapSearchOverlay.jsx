// Web version — no react-native-maps (native version is MapSearchOverlay.native.jsx)
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height: SH } = Dimensions.get("window");
export const MAP_HEIGHT = Math.min(Math.round(SH * 0.40), 265);

const C = {
  radar:   "#6C63FF",
  userBlue:"#4285F4",
  pin:     "#EF4444",
  bg:      "#05050f",
  success: "#34D399",
  text:    "#C8C8E0",
  pillBg:  "#05050fDD",
};

// ── Radar ring ────────────────────────────────────────────────────────────────
function RadarRing({ delay }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 2600, delay, useNativeDriver: true })
        .start(({ finished }) => { if (finished && alive) loop(); });
    };
    loop();
    return () => { alive = false; anim.stopAnimation(); };
  }, []);

  const scale   = anim.interpolate({ inputRange: [0, 1],             outputRange: [0.05, 5.8] });
  const opacity = anim.interpolate({ inputRange: [0, 0.18, 0.6, 1], outputRange: [0, 0.95, 0.35, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 70, height: 70, borderRadius: 35,
        borderWidth: 1.5, borderColor: C.radar,
        opacity, transform: [{ scale }],
      }}
    />
  );
}

// ── User dot ──────────────────────────────────────────────────────────────────
function UserDot() {
  const breath = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 2.2, duration: 1100, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 1,   duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: 26, height: 26, justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{
        position: "absolute", width: 22, height: 22, borderRadius: 11,
        borderWidth: 1.5, borderColor: C.userBlue + "70",
        transform: [{ scale: breath }],
      }} />
      <View style={{
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: C.userBlue,
        borderWidth: 2.5, borderColor: "#fff",
      }} />
    </View>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ isSearching, count }) {
  const blip = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isSearching) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(blip, { toValue: 1.7, duration: 550, useNativeDriver: true }),
        Animated.timing(blip, { toValue: 1,   duration: 550, useNativeDriver: true }),
      ])
    ).start();
  }, [isSearching]);

  const done = !isSearching && count > 0;
  return (
    <View style={s.statusWrap} pointerEvents="none">
      <View style={[s.pill, done && s.pillDone]}>
        {isSearching ? (
          <>
            <Animated.View style={[s.blip, { transform: [{ scale: blip }] }]} />
            <Text style={s.pillText}>Scanning nearby providers...</Text>
          </>
        ) : done ? (
          <>
            <Ionicons name="checkmark-circle" size={13} color={C.success} />
            <Text style={[s.pillText, { color: C.success }]}>
              {count} provider{count !== 1 ? "s" : ""} located
            </Text>
          </>
        ) : (
          <Text style={s.pillText}>Waiting for results...</Text>
        )}
      </View>
    </View>
  );
}

// ── Main export (web: radar animation without map tiles) ─────────────────────
export default function MapSearchOverlay({ providers = [], isSearching = true }) {
  return (
    <View style={s.map}>
      {/* Subtle grid — gives a "map" feel without actual tiles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[0.15, 0.30, 0.45, 0.60, 0.75, 0.90].map((f) => (
          <View key={`h${f}`} style={[s.grid, { top: f * MAP_HEIGHT, left: 0, right: 0, height: 1 }]} />
        ))}
        {[0.12, 0.25, 0.38, 0.51, 0.64, 0.77, 0.90].map((f, i) => (
          <View key={`v${i}`} style={[s.grid, { top: 0, bottom: 0, left: `${f * 100}%`, width: 1 }]} />
        ))}
      </View>

      {/* Radar centre */}
      <View style={s.centre}>
        {isSearching && [0, 650, 1300, 1950].map((d, i) => (
          <RadarRing key={i} delay={d} />
        ))}
        <UserDot />
      </View>

      {/* Corner watermark */}
      <View style={s.brand} pointerEvents="none">
        <Text style={[s.brandText, { color: "#EAEAEA" }]}>Book</Text>
        <Text style={[s.brandText, { color: "#00BCD4" }]}>N</Text>
        <Text style={[s.brandText, { color: "#E91E8C" }]}>Fix</Text>
      </View>

      <StatusBadge isSearching={isSearching} count={providers.length} />
    </View>
  );
}

const s = StyleSheet.create({
  map: {
    width: "100%", height: MAP_HEIGHT,
    borderRadius: 18, overflow: "hidden",
    backgroundColor: C.bg,
    justifyContent: "center", alignItems: "center",
  },
  grid:   { position: "absolute", backgroundColor: "#ffffff07" },
  centre: { width: 80, height: 80, justifyContent: "center", alignItems: "center" },
  statusWrap: {
    position: "absolute", bottom: 14, left: 0, right: 0, alignItems: "center",
  },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: C.pillBg,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1, borderColor: C.radar + "55",
  },
  pillDone: { borderColor: C.success + "55", backgroundColor: "#03100aDD" },
  pillText: { fontSize: 12, color: C.text, fontWeight: "600" },
  blip: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.radar,
  },
  brand: {
    position: "absolute", top: 12, right: 14,
    flexDirection: "row",
    backgroundColor: "#05050fAA",
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: C.radar + "33",
  },
  brandText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
});
