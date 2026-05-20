import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, Linking, useWindowDimensions, ScrollView, Pressable, Platform,
  ActivityIndicator, Modal, PanResponder,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../services/api";
import { COLORS, SERVICE_CATEGORIES } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { toE164 } from "../../components/BookingModal";

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
          // Add house number or building name
          parts.push(addr.name);
        }
        if (addr.street && addr.street !== addr.district) {
          // Add specific street/road
          parts.push(addr.street);
        }
        if (addr.district) {
          // Add specific neighborhood/colony (e.g. Model Colony)
          parts.push(addr.district);
        }
        if (addr.subregion && addr.subregion !== addr.city) {
          // Add sub-district/area (e.g. Model Town)
          parts.push(addr.subregion);
        }
        if (addr.city) {
          parts.push(addr.city);
        }
        
        const fullAddress = parts.filter(Boolean).join(", ");
        if (fullAddress) {
          return fullAddress;
        }
      }
    } catch (e) {
      console.log("[reverseGeocode] Native geocoder failed, trying Nominatim fallback...", e);
    }
  }try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en&zoom=16`,
      { headers: { "User-Agent": "ServiceAI/1.0" } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const clean = (s) => (s || "").replace(/\s+(District|Division|Tehsil|City)$/i, "").trim();
    const city = clean(addr.city || addr.district || addr.county || addr.town || "Karachi");
    // Try many area fields + first word of display_name as final fallback
    const areaFromDisplay = data.display_name?.split(",")[0]?.trim() || "";
    const area = addr.neighbourhood || addr.suburb || addr.quarter ||
      addr.residential || addr.road || areaFromDisplay || "";
    return [area, city].filter(Boolean).join(", ") || "Karachi";
  } catch { return "Karachi"; }
}

async function fetchNearbyPlaces(lat, lng) {
  try {
    const delta = 0.04;
    const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;

    // Fetch suburbs, parks, and roads in parallel to populate the premium mockup radar layers!
    const urls = [
      `https://nominatim.openstreetmap.org/search?q=suburb&format=json&limit=6&viewbox=${viewbox}&bounded=1`,
      `https://nominatim.openstreetmap.org/search?q=park&format=json&limit=4&viewbox=${viewbox}&bounded=1`,
      `https://nominatim.openstreetmap.org/search?q=road&format=json&limit=4&viewbox=${viewbox}&bounded=1`
    ];

    const headers = { "User-Agent": "ServiceAI-Mobile/1.0" };

    const results = await Promise.all(
      urls.map(url => fetch(url, { headers }).then(r => r.json()).catch(() => []))
    );

    const [suburbs, parks, roads] = results;

    const places = [];

    suburbs.forEach(p => {
      if (p.name && p.lat && p.lon) {
        places.push({ type: "hood", name: p.name, lat: parseFloat(p.lat), lon: parseFloat(p.lon) });
      }
    });

    parks.forEach(p => {
      if (p.name && p.lat && p.lon) {
        places.push({ type: "park", name: p.name, lat: parseFloat(p.lat), lon: parseFloat(p.lon) });
      }
    });

    roads.forEach(p => {
      if (p.name && p.lat && p.lon) {
        places.push({ type: "road", name: p.name, lat: parseFloat(p.lat), lon: parseFloat(p.lon) });
      }
    });

    return places;
  } catch {
    return [];
  }
}

function mapPlacesToLabels(places, coords, cx, cy, W, H, maxR, HEADER_H, DELTA) {
  const hoodColors = [COLORS.info, COLORS.violet, COLORS.warning, COLORS.pink, COLORS.success, COLORS.primary];

  const defaultLabels = [
    // Neighborhoods (hoods)
    { type: "hood", name: "DHA PH 6", x: cx - W * 0.28, y: cy - H * 0.15, color: COLORS.info },
    { type: "hood", name: "BUKHARI COMM.", x: cx + W * 0.22, y: cy - H * 0.23, color: COLORS.violet },
    { type: "hood", name: "ZAMZAMA", x: cx + W * 0.32, y: cy + H * 0.06, color: COLORS.warning },
    { type: "hood", name: "KHAYABAN-E-ITTEHAD", x: cx + W * 0.15, y: cy - H * 0.02, color: COLORS.pink },
    { type: "hood", name: "SABA AVENUE", x: cx - W * 0.28, y: cy + H * 0.18, color: COLORS.success },
    { type: "hood", name: "TAUHEED COMM.", x: cx + W * 0.10, y: cy + H * 0.16, color: COLORS.primary },

    // Roads
    { type: "road", name: "KHAYABAN-E-SHAHBAZ", x: cx, y: cy - H * 0.10, angle: 10 },
    { type: "road", name: "KHAYABAN-E-ITTEHAD", x: cx - W * 0.10, y: cy + H * 0.10, angle: -15 },

    // Parks
    { type: "park", name: "BAGH IBNE QASIM", x: cx - W * 0.32, y: cy - H * 0.23 },
    { type: "park", name: "HILL PARK", x: cx + W * 0.30, y: cy - H * 0.25 },
    { type: "park", name: "BEACH PARK", x: cx - W * 0.16, y: cy + H * 0.25 }
  ];

  if (!places || places.length === 0 || !coords) return defaultLabels;

  const mapped = [];
  let hoodCount = 0;
  let parkCount = 0;
  let roadCount = 0;

  places.forEach((p) => {
    let dx = p.lon - coords.lng;
    let dy = p.lat - coords.lat;

    let sx = cx + (dx / DELTA) * (W * 0.5);
    let sy = cy - (dy / DELTA) * (H * 0.4);

    const paddingX = 60;
    const paddingY = HEADER_H + 40;

    sx = Math.max(paddingX, Math.min(W - paddingX, sx));
    sy = Math.max(paddingY, Math.min(H - H * 0.18 - 40, sy));

    const distToCenter = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
    if (distToCenter < 50) {
      const angle = Math.atan2(sy - cy, sx - cx);
      sx = cx + Math.cos(angle) * 60;
      sy = cy + Math.sin(angle) * 60;
    }

    let type = "hood";
    const nameUpper = p.name.toUpperCase();
    if (nameUpper.includes("PARK") || nameUpper.includes("GARDEN") || nameUpper.includes("PLAYGROUND") || nameUpper.includes("GROUND") || nameUpper.includes("BAGH")) {
      type = "park";
    } else if (nameUpper.includes("ROAD") || nameUpper.includes("AVENUE") || nameUpper.includes("STREET") || nameUpper.includes("KHY") || nameUpper.includes("BOULEVARD") || nameUpper.includes("RD")) {
      type = "road";
    }

    if (type === "hood" && hoodCount < 6) {
      const cleanName = p.name.toUpperCase()
        .replace(/\b(DISTRICT|DIVISION|TEHSIL|CITY|PROVINCE|PUNJAB|SINDH)\b/gi, "")
        .trim();

      if (cleanName.length > 2) {
        mapped.push({
          type: "hood",
          name: cleanName,
          x: sx,
          y: sy,
          color: hoodColors[hoodCount % hoodColors.length]
        });
        hoodCount++;
      }
    } else if (type === "park" && parkCount < 3) {
      mapped.push({
        type: "park",
        name: p.name.toUpperCase(),
        x: sx,
        y: sy
      });
      parkCount++;
    } else if (type === "road" && roadCount < 2) {
      mapped.push({
        type: "road",
        name: p.name.toUpperCase(),
        x: sx,
        y: sy,
        angle: roadCount === 0 ? 12 : -15
      });
      roadCount++;
    }
  });

  if (mapped.length < 4) {
    return defaultLabels;
  }

  return mapped;
}

const PIN_OFFSETS = [
  { rx: 0.32, ry: -0.22 },
  { rx: -0.40, ry: 0.12 },
  { rx: 0.18, ry: 0.32 },
  { rx: -0.54, ry: -0.28 },
  { rx: 0.52, ry: 0.14 },
  { rx: -0.18, ry: 0.46 },
  { rx: 0.64, ry: -0.38 },
  { rx: -0.30, ry: -0.46 },
  { rx: 0.10, ry: -0.54 },
  { rx: 0.38, ry: 0.50 },
];

// ── Map background (View-based neon grid) ────────────────────────────────────
function MapBackground({ width, height, nearbyLabels, locText }) {
  const lines = Array.from({ length: 17 }, (_, i) => (i + 1) / 18);
  const waveAnim = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: width,
        duration: 6500,
        useNativeDriver: true,
      })
    ).start();
  }, [width]);

  // Procedural buildings Footprints (deterministic using a simple LCG random seed)
  const buildings = useMemo(() => {
    let s = 12;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const arr = [];
    for (let i = 0; i < 75; i++) {
      const bx = r();
      const by = r() * 0.76; // keep above water
      arr.push({
        x: bx,
        y: by,
        w: 0.018 + r() * 0.035,
        h: 0.014 + r() * 0.028,
        rot: `${(r() * 8 - 4).toFixed(1)}deg`,
      });
    }
    return arr;
  }, []);

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#070710" }}>
      {/* Street grid */}
      {lines.map((x, i) => (
        <View key={`v${i}`} style={{
          position: "absolute", left: x * width, top: 0, bottom: 0,
          width: i % 3 === 0 ? 1.5 : 0.8,
          backgroundColor: i % 3 === 0 ? "#181834" : "#0D0D22",
        }} />
      ))}
      {lines.map((y, i) => (
        <View key={`h${i}`} style={{
          position: "absolute", top: y * height * 0.82, left: 0, right: 0,
          height: i % 3 === 0 ? 1.5 : 0.8,
          backgroundColor: i % 3 === 0 ? "#181834" : "#0D0D22",
        }} />
      ))}

      {/* Procedural Building Footprints */}
      {buildings.map((b, i) => (
        <View
          key={`bld-${i}`}
          style={{
            position: "absolute",
            left: b.x * width,
            top: b.y * height * 0.82,
            width: b.w * width,
            height: b.h * height * 0.82,
            borderRadius: 2,
            borderWidth: 0.5,
            borderColor: "rgba(108,99,255,0.15)",
            backgroundColor: "rgba(108,99,255,0.06)",
            transform: [{ rotate: b.rot }],
          }}
        />
      ))}

      {/* Major boulevards */}
      <View style={{ position: "absolute", top: 0.27 * height, left: 0, right: 0, height: 5, backgroundColor: "#3A3A7F" }} />
      <View style={{ position: "absolute", top: 0.27 * height + 1.5, left: 0, right: 0, height: 2, backgroundColor: "#2A2A5E" }} />
      <View style={{ position: "absolute", top: 0.52 * height, left: 0, right: 0, height: 5, backgroundColor: "#3A3A7F" }} />
      <View style={{ position: "absolute", top: 0.52 * height + 1.5, left: 0, right: 0, height: 2, backgroundColor: "#2A2A5E" }} />
      <View style={{ position: "absolute", left: 0.55 * width, top: 0, height: height * 0.82, width: 5, backgroundColor: "#3A3A7F" }} />
      <View style={{ position: "absolute", left: 0.55 * width + 1.5, top: 0, height: height * 0.82, width: 2, backgroundColor: "#2A2A5E" }} />

      {/* Coastline & Water area */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: height * 0.18 }}>
        <LinearGradient
          colors={["#1F3A56", "#0A1A2A", "#06101A"]}
          style={StyleSheet.absoluteFill}
        />
        {/* Coastline division line */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, backgroundColor: "#1F3A56", opacity: 0.7 }} />

        {/* Animated wave shimmer on water */}
        <Animated.View
          style={{
            position: "absolute",
            top: 15,
            left: 0,
            width: 140,
            height: 2.5,
            backgroundColor: "rgba(56,189,248,0.22)",
            transform: [{ translateX: waveAnim }],
          }}
        />

        {/* Water label */}
        <Text style={{
          position: "absolute",
          bottom: 24, left: 0, right: 0,
          textAlign: "center",
          fontSize: 9, color: "#3A6F9E",
          fontWeight: "800", letterSpacing: 3.5,
          opacity: 0.85
        }}>
          {locText?.toLowerCase().includes("karachi") ? "ARABIAN SEA" : "LOCAL WATERWAY"}
        </Text>
      </View>

      {/* Styled nearby elements — real GPS places / fallback */}
      {(nearbyLabels || []).map((l, i) => {
        if (l.type === "hood") {
          return (
            <View
              key={`hood-${i}`}
              style={{
                position: "absolute",
                left: l.x - 55,
                top: l.y - 20,
                width: 110,
                height: 40,
                borderWidth: 1.2,
                borderColor: l.color + "44",
                borderStyle: "dashed",
                borderRadius: 8,
                backgroundColor: l.color + "06",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{
                fontSize: 7.2,
                color: l.color,
                fontWeight: "900",
                letterSpacing: 1.2,
                textAlign: "center"
              }}>
                {l.name}
              </Text>
            </View>
          );
        }
        if (l.type === "park") {
          return (
            <View
              key={`park-${i}`}
              style={{
                position: "absolute",
                left: l.x - 50,
                top: l.y - 12,
                width: 100,
                height: 24,
                borderWidth: 0.8,
                borderColor: "rgba(16,217,160,0.28)",
                borderStyle: "dashed",
                borderRadius: 4,
                backgroundColor: "rgba(16,217,160,0.10)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{
                fontSize: 6.5,
                color: "rgba(16,217,160,0.75)",
                fontWeight: "800",
                letterSpacing: 0.8,
                textAlign: "center"
              }}>
                {l.name}
              </Text>
            </View>
          );
        }
        if (l.type === "road") {
          return (
            <Text
              key={`road-${i}`}
              style={{
                position: "absolute",
                left: l.x - 75,
                top: l.y - 6,
                width: 150,
                textAlign: "center",
                fontSize: 6.8,
                color: "#8B85FF",
                fontWeight: "800",
                letterSpacing: 0.8,
                transform: [{ rotate: `${l.angle || 0}deg` }],
                opacity: 0.85,
              }}
            >
              {l.name}
            </Text>
          );
        }
        return null;
      })}

      {/* Vignette overlay */}
      <LinearGradient colors={["rgba(7,7,16,0)", "rgba(7,7,16,0.65)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  );
}

// ── Radar rings, sweep, and crosshairs ───────────────────────────────────────
function RadarOverlay({ cx, cy, maxR, active, sweepDeg, rings }) {
  if (!active) return null;

  if (Platform.OS === "web") {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Static reference rings */}
        {[0.35, 0.70, 1.0].map((s, i) => (
          <View key={i} style={{
            position: "absolute",
            left: cx - maxR * s, top: cy - maxR * s,
            width: maxR * 2 * s, height: maxR * 2 * s,
            borderRadius: maxR * s,
            borderWidth: 1, borderColor: COLORS.success + "26", borderStyle: "dashed",
          }} />
        ))}
        {/* Distance tick labels */}
        {[{ s: 0.35, label: "500m" }, { s: 0.70, label: "1km" }, { s: 1.0, label: "2km" }].map((r, i) => (
          <Text key={i} style={{
            position: "absolute",
            left: cx + maxR * r.s + 4, top: cy - 8,
            fontSize: 7, color: COLORS.success + "77", fontWeight: "700", letterSpacing: 0.5,
          }}>{r.label}</Text>
        ))}
        {/* Crosshair */}
        <View style={{ position: "absolute", left: cx - maxR, top: cy - 0.5, width: maxR * 2, height: 1, backgroundColor: COLORS.success + "22" }} />
        <View style={{ position: "absolute", left: cx - 0.5, top: cy - maxR, width: 1, height: maxR * 2, backgroundColor: COLORS.success + "22" }} />

        {/* Expanding glowing rings */}
        {rings.map((r, i) => (
          <Animated.View key={i} style={{
            position: "absolute",
            left: cx - maxR, top: cy - maxR,
            width: maxR * 2, height: maxR * 2,
            borderRadius: maxR, borderWidth: 2, borderColor: COLORS.success,
            opacity: r.opacity, transform: [{ scale: r.scale }],
            // Premium glowing shadow matching CSS box-shadow
            shadowColor: COLORS.success,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.65,
            shadowRadius: 16,
          }} />
        ))}

        {/* Sweep cone (Web conic-gradient) */}
        <Animated.View style={{
          position: "absolute",
          left: cx - maxR, top: cy - maxR,
          width: maxR * 2, height: maxR * 2,
          borderRadius: maxR,
          transform: [{ rotate: sweepDeg }],
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg,
              ${COLORS.success}00 0deg, ${COLORS.success}00 280deg,
              ${COLORS.success}22 320deg, ${COLORS.success}88 355deg,
              ${COLORS.success}ee 360deg, ${COLORS.success}00 360deg)`,
            opacity: 0.9,
          }} />
        </Animated.View>
      </View>
    );
  }

  // Native volumetric sweep tail using layered overlapping half-circles
  const angles = [0, -8, -16, -24, -32, -40, -48, -56];
  const opacities = [0.95, 0.75, 0.55, 0.40, 0.28, 0.18, 0.10, 0.05];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[0.35, 0.70, 1.0].map((s, i) => (
        <View key={i} style={{
          position: "absolute",
          left: cx - maxR * s, top: cy - maxR * s,
          width: maxR * 2 * s, height: maxR * 2 * s,
          borderRadius: maxR * s,
          borderWidth: 1, borderColor: COLORS.success + "26", borderStyle: "dashed",
        }} />
      ))}
      {/* Distance tick labels */}
      {[{ s: 0.35, label: "500m" }, { s: 0.70, label: "1km" }, { s: 1.0, label: "2km" }].map((r, i) => (
        <Text key={i} style={{
          position: "absolute",
          left: cx + maxR * r.s + 4, top: cy - 8,
          fontSize: 7, color: COLORS.success + "77", fontWeight: "700", letterSpacing: 0.5,
        }}>{r.label}</Text>
      ))}
      {/* Crosshair */}
      <View style={{ position: "absolute", left: cx - maxR, top: cy - 0.5, width: maxR * 2, height: 1, backgroundColor: COLORS.success + "22" }} />
      <View style={{ position: "absolute", left: cx - 0.5, top: cy - maxR, width: 1, height: maxR * 2, backgroundColor: COLORS.success + "22" }} />

      {/* Expanding rings */}
      {rings.map((r, i) => (
        <Animated.View key={i} style={{
          position: "absolute",
          left: cx - maxR, top: cy - maxR,
          width: maxR * 2, height: maxR * 2,
          borderRadius: maxR, borderWidth: 2, borderColor: COLORS.success,
          opacity: r.opacity, transform: [{ scale: r.scale }],
          shadowColor: COLORS.success,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 4,
        }} />
      ))}

      {/* Sweep cone (Native volumetric layered tail) */}
      <Animated.View style={{
        position: "absolute",
        left: cx - maxR, top: cy - maxR,
        width: maxR * 2, height: maxR * 2,
        borderRadius: maxR,
        transform: [{ rotate: sweepDeg }],
      }}>
        {angles.map((ang, idx) => (
          <View key={idx} style={{
            position: "absolute",
            inset: 0,
            borderRadius: maxR,
            overflow: "hidden",
            transform: [{ rotate: `${ang}deg` }],
            opacity: opacities[idx],
          }}>
            <LinearGradient
              colors={[COLORS.success + "00", COLORS.success + "20", COLORS.success + "BB"]}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
              style={{ position: "absolute", right: 0, top: 0, width: maxR, height: maxR * 2 }}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ── User pin ─────────────────────────────────────────────────────────────────
function UserPin({ cx, cy, haloScale }) {
  return (
    <>
      {/* Outer pulsing ring glow */}
      <Animated.View pointerEvents="none" style={{
        position: "absolute",
        left: cx - 35, top: cy - 35,
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: COLORS.primary + "1A",
        borderWidth: 1.5, borderColor: COLORS.primary + "33",
        transform: [{ scale: haloScale }],
      }} />

      {/* Middle nested neon circle */}
      <View pointerEvents="none" style={{
        position: "absolute",
        left: cx - 20, top: cy - 20,
        width: 40, height: 40, borderRadius: 20,
        borderWidth: 2, borderColor: COLORS.primary + "AA",
        backgroundColor: "rgba(7,7,16,0.7)",
        alignItems: "center", justifyContent: "center",
        shadowColor: COLORS.primary, shadowOpacity: 0.6, shadowRadius: 10, elevation: 8,
      }}>
        {/* Core center dot with bright white core */}
        <View style={{
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: COLORS.primary,
          borderWidth: 2.5, borderColor: "#FFFFFF",
        }} />
      </View>
    </>
  );
}

// ── Shop pin ─────────────────────────────────────────────────────────────────
function ShopPin({ x, y, index, label, dist, active, onPress }) {
  const dropAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(dropAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
    Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
  }, []);

  const pinTY = dropAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] });
  const pulseScl = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 3.2] });
  const pulseOp = pulseAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.65, 0.3, 0] });

  return (
    <>
      {/* Pulse effect */}
      <Animated.View pointerEvents="none" style={{
        position: "absolute", left: x - 18, top: y - 18,
        width: 36, height: 36, borderRadius: 18,
        borderWidth: 2, borderColor: COLORS.danger,
        opacity: pulseOp, transform: [{ scale: pulseScl }],
      }} />

      {/* Floating details banner (only visible when active, matching mockup) */}
      {active && (
        <Animated.View pointerEvents="none" style={{
          position: "absolute",
          left: x - 75, top: y - 82,
          width: 150,
          zIndex: 99,
          transform: [{ translateY: pinTY }]
        }}>
          <View style={{
            backgroundColor: "rgba(7,7,16,0.95)",
            borderWidth: 1.2, borderColor: COLORS.primary + "AA",
            borderRadius: 10, padding: 8,
            shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 8, elevation: 8,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.danger }} />
              <Text style={{ color: COLORS.text, fontSize: 10, fontWeight: "800", flex: 1 }} numberOfLines={1}>{label}</Text>
            </View>
            <Text style={{ fontSize: 9, color: COLORS.textSecondary, marginTop: 2, fontWeight: "600" }}>{dist} km away</Text>
          </View>
        </Animated.View>
      )}

      {/* Teardrop Pin */}
      <Animated.View style={{
        position: "absolute", left: x - 16, top: y - 38,
        opacity: dropAnim, transform: [{ translateY: pinTY }],
        zIndex: 10 + index,
      }}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ alignItems: "center" }}>
          {/* Custom CSS/RN Teardrop */}
          <View style={{
            width: 32, height: 32,
            backgroundColor: COLORS.danger,
            borderWidth: 1.5, borderColor: "#FFFFFF",
            borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16,
            transform: [{ rotate: "45deg" }],
            shadowColor: COLORS.danger, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
            alignItems: "center", justifyContent: "center"
          }}>
            {/* White circle inside containing index number */}
            <View style={{
              width: 16, height: 16,
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              transform: [{ rotate: "-45deg" }], // Keep text upright!
              alignItems: "center", justifyContent: "center"
            }}>
              <Text style={{ color: COLORS.danger, fontSize: 10, fontWeight: "900" }}>{index + 1}</Text>
            </View>
          </View>
          {/* Little shadow under pin */}
          <View style={{ width: 14, height: 3, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 3, marginTop: 1 }} />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

// ── Bold-text parser (renders **text** in primary color) ─────────────────────
function BoldText({ text, style, highlightColor }) {
  const parts = (text || "").split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={i} style={{ color: highlightColor || COLORS.primary, fontWeight: "900" }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

// ── AI Analysis Card ─────────────────────────────────────────────────────────
function AnalysisCard({ report, count }) {
  if (!report) return null;

  // Extract first bold entity as top pick
  const topPickMatch = report.match(/\*\*([^*]+)\*\*/);
  const topPick = topPickMatch ? topPickMatch[1] : null;

  // Extract the last sentence or line of the report that states why the AI preferred it as top
  const lastSentence = (() => {
    const cleaned = report.trim();
    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length === 0) return cleaned;
    let last = sentences[sentences.length - 1];
    if (last.length < 25 && sentences.length > 1) {
      last = sentences[sentences.length - 2] + " " + last;
    }
    return last;
  })();

  // Parse detailed business items from markdown
  const analyzedBusinesses = [];
  const lines = report.split("\n");

  // 1. Try to parse from the Markdown table rows first!
  const tableRows = [];
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && !trimmed.toLowerCase().includes("rank") && !trimmed.includes("---")) {
      const parts = trimmed.split("|").map(p => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const rankNum = parseInt(parts[0], 10);
        if (!isNaN(rankNum)) {
          tableRows.push({
            index: rankNum,
            name: parts[1],
            rating: parts[2],
            reviews: parts[3],
            distance: parts[4],
            phone: parts[5],
            address: parts[6],
            score: parts[7]
          });
        }
      }
    }
  });

  // 2. Try to parse detailed paragraph analysis per business
  const businessDetails = {};
  let currentBizName = null;
  let currentBizText = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const headerMatch = trimmed.match(/^(?:###?\s*(?:\d+\.\s*)?|\d+\.\s*\*\*)([^*#\n:]+)(?:\*\*)?$/) ||
      trimmed.match(/^(?:###?\s*)?\s*\*\*([^*:]+)\*\*\s*$/);

    if (headerMatch) {
      if (currentBizName && currentBizText.length > 0) {
        businessDetails[currentBizName.toLowerCase()] = currentBizText.join(" ");
      }
      currentBizName = headerMatch[1].trim();
      currentBizText = [];
    } else if (currentBizName) {
      if (trimmed.startsWith("*") || trimmed.startsWith("-") || trimmed.match(/^\w+:/)) {
        currentBizText.push(trimmed);
      } else if (!trimmed.startsWith("|") && !trimmed.startsWith("#")) {
        currentBizText.push(trimmed);
      }
    }
  });
  if (currentBizName && currentBizText.length > 0) {
    businessDetails[currentBizName.toLowerCase()] = currentBizText.join(" ");
  }

  // 3. Assemble analyzedBusinesses
  if (tableRows.length > 0) {
    tableRows.forEach((row) => {
      let description = "";
      const lowerName = row.name.toLowerCase();
      const matchKey = Object.keys(businessDetails).find(k => lowerName.includes(k) || k.includes(lowerName));
      if (matchKey) {
        description = businessDetails[matchKey];
      }

      if (!description) {
        const details = [];
        if (row.rating && row.rating !== "N/A") details.push(`Rating: ${row.rating} (${row.reviews || '?'} reviews)`);
        if (row.distance && row.distance !== "N/A") details.push(`Distance: ${row.distance}`);
        if (row.phone && row.phone !== "N/A") details.push(`Phone: ${row.phone}`);
        if (row.address && row.address !== "N/A") details.push(`Address: ${row.address}`);
        description = details.join(" • ") || "Highly rated local service provider.";
      }

      analyzedBusinesses.push({
        index: row.index,
        name: row.name,
        description: description,
      });
    });
  } else {
    // Fallback to legacy regex line parser if table is not present
    let currentIdx = 1;
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^(?:\d+\.\s*)?\s*\*\*([^*]+)\*\*:\s*(.*)$/);
      if (match) {
        analyzedBusinesses.push({
          index: currentIdx++,
          name: match[1].trim(),
          description: match[2].trim(),
        });
      } else {
        const match2 = trimmed.match(/^(?:\d+\.\s*)?\s*\*\*([^*]+)\*\*\s+(.*)$/);
        if (match2) {
          analyzedBusinesses.push({
            index: currentIdx++,
            name: match2[1].trim(),
            description: match2[2].trim(),
          });
        }
      }
    });
  }

  return (
    <View style={s.analysisCard}>
      {/* Gradient header */}
      <LinearGradient
        colors={["rgba(108,99,255,0.18)", "rgba(167,139,250,0.08)"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.analysisHeader}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.violet]}
          style={s.analysisIconWrap}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={13} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.analysisTitle}>AI PREFERENCE SUMMARY</Text>
          <Text style={s.analysisMeta}>{count} providers evaluated</Text>
        </View>
        <View style={s.liveBadge}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.success }} />
          <Text style={s.liveBadgeText}>LIVE</Text>
        </View>
      </LinearGradient>

      {/* Top pick highlighted row */}
      {topPick && (
        <View style={s.topPickRow}>
          <LinearGradient
            colors={[COLORS.success + "15", COLORS.successDark + "08"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.topPickGrad}
          >
            <View style={s.topPickIcon}>
              <Ionicons name="trophy" size={11} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.topPickLabel}>TOP RECOMMENDATION</Text>
              <Text style={s.topPickName} numberOfLines={1}>{topPick}</Text>
            </View>
            <View style={s.rankOne}>
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>#1</Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Structured Evaluation spectrum list */}
      {analyzedBusinesses.length > 0 && (
        <View style={{ paddingHorizontal: 0, paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 12, paddingHorizontal: 12 }}>
            <View style={{ width: 3, height: 12, backgroundColor: COLORS.primary, borderRadius: 2 }} />
            <Text style={{ fontSize: 11, fontWeight: "900", color: COLORS.text, letterSpacing: 0.5 }}>EVALUATION SPECTRUM</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={288}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          >
            {analyzedBusinesses.map((item, i) => {
              // Highlight negative indicators with warning colors for high visual fidelity
              const descLower = item.description.toLowerCase();
              const hasNoData = descLower.includes("no available rating") ||
                descLower.includes("lacks any meaningful data") ||
                descLower.includes("no available data") ||
                descLower.includes("no other information");

              const leftBorderColor = hasNoData ? COLORS.warning : COLORS.primary;
              const cardBgColors = hasNoData
                ? ["rgba(245, 158, 11, 0.12)", "rgba(245, 158, 11, 0.02)"]
                : ["rgba(108, 99, 255, 0.15)", "rgba(108, 99, 255, 0.02)"];
              const badgeBg = hasNoData ? COLORS.warning : COLORS.primary;
              const indicatorIcon = hasNoData ? "alert-circle" : "shield-checkmark";
              const indicatorIconColor = hasNoData ? COLORS.warning : COLORS.primary;

              return (
                <View
                  key={i}
                  style={{
                    width: 280,
                    height: 125,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.06)",
                    borderLeftWidth: 4,
                    borderLeftColor: leftBorderColor,
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={cardBgColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1, padding: 12, justifyContent: "space-between" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{
                        backgroundColor: badgeBg,
                        width: 22, height: 22,
                        borderRadius: 8,
                        alignItems: "center", justifyContent: "center",
                        shadowColor: badgeBg,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 4,
                      }}>
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>{item.index}</Text>
                      </View>

                      <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF", flex: 1 }} numberOfLines={1}>
                        {item.name}
                      </Text>

                      <Ionicons name={indicatorIcon} size={14} color={indicatorIconColor} style={{ opacity: 0.8 }} />
                    </View>

                    <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.85)", lineHeight: 16.5 }} numberOfLines={4}>
                      {item.description}
                    </Text>
                  </LinearGradient>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Divider */}
      <View style={s.analysisDivider} />

      {/* Concluding footer note */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 14, paddingTop: 2 }}>
        <BoldText
          text={lastSentence}
          style={{ fontSize: 11.5, color: COLORS.textMuted, lineHeight: 17.5 }}
          highlightColor={COLORS.primaryLight}
        />
      </View>
    </View>
  );
}

// ── Skeleton Loader Row ──────────────────────────────────────────────────────
function SkeletonRow() {
  const pulseAnim = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 1100, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[s.skeletonCard, { opacity: pulseAnim }]}>
      <View style={s.skeletonRank} />
      <View style={{ flex: 1 }}>
        <View style={s.skeletonName} />
        <View style={s.skeletonAddr} />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <View style={s.skeletonMeta} />
          <View style={[s.skeletonMeta, { width: 55 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

// ── Bottom sheet ─────────────────────────────────────────────────────────────
function BottomSheet({ sheetAnim, found, businesses, locationText, report, active, setActive, onClose, phase, onBook }) {
  const displayCount = businesses.length > 0 ? businesses.length : Math.max(found, 0);

  // Define swipe-down PanResponder to dismiss bottom sheet gracefully
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          sheetAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.4) {
          // Swipe down is fast/large -> slide closed
          onClose();
        } else {
          // Snap back up to open position
          Animated.spring(sheetAnim, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View style={[s.sheet, { transform: [{ translateY: sheetAnim }] }]}>
      {/* Draggable Top Handle Container */}
      <View 
        {...panResponder.panHandlers}
        style={{ width: "100%", alignItems: "center", paddingTop: 8, paddingBottom: 10 }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.borderLight }} />
      </View>
      <View style={s.sheetHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.sheetCount}>
            {phase === "scanning" ? "Scanning" : displayCount}
            <Text style={s.sheetCountSub}> {phase === "scanning" ? " radar area..." : "providers found"}</Text>
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
            <Ionicons name="location-outline" size={10} color={COLORS.success} />
            <Text style={s.sheetSub} numberOfLines={1}>{locationText} · Sorted by score</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 56 }} showsVerticalScrollIndicator={false}>
        {/* Scanning Skeleton Rows / Normal Cards */}
        {phase === "scanning" ? (
          <View style={{ gap: 4, marginTop: 4 }}>
            <View style={s.lookingContainer}>
              <ActivityIndicator color={COLORS.success} size="small" />
              <Text style={s.lookingText}>Looking for providers...</Text>
            </View>
            {[1, 2, 3].map((idx) => (
              <SkeletonRow key={idx} />
            ))}
          </View>
        ) : (
          <>
            {/* AI Analysis Card */}
            {report && (
              <AnalysisCard report={report} count={businesses.length || found} />
            )}

            {/* Business cards */}
            {businesses.map((biz, i) => {
              const name = biz?.name || `Scraped provider ${i + 1}`;
              const address = biz?.address || "No address listed";
              const dist = biz?.distance_km != null ? biz.distance_km : ((i + 1) * 0.65).toFixed(1);
              const rating = biz?.rating || 5.0;
              const reviews = biz?.review_count || 12;
              const score = biz?.total_score || null;

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => { setActive(i); onBook(biz); }}
                  style={[s.bizCard, active === i && s.bizCardActive, { flexDirection: "row", alignItems: "center", gap: 10 }]}
                  activeOpacity={0.8}
                >
                  <View style={[s.rankBadge,
                  i === 0 && { backgroundColor: COLORS.warning },
                  i === 1 && { backgroundColor: COLORS.textMuted },
                  i === 2 && { backgroundColor: "#CD7F32" },
                  active === i && { shadowColor: COLORS.danger, shadowOpacity: 0.7, shadowRadius: 6 },
                  ]}>
                    <Text style={s.rankNum}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                      <Text style={s.bizName} numberOfLines={1}>{name}</Text>
                      {rating != null && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Ionicons name="star" size={11} color={COLORS.warning} />
                          <Text style={s.bizRating}>{rating}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.bizAddr} numberOfLines={1}>{address}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="navigate-outline" size={10} color={COLORS.success} />
                        <Text style={s.bizDist}>{dist} km</Text>
                      </View>
                      {reviews && <Text style={s.bizReviews}>{reviews} reviews</Text>}
                      {score && <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Score {score}</Text>}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ paddingLeft: 4 }} />
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

// ── Booking Pending Overlay ───────────────────────────────────────────────────
function BookingPendingOverlay({ biz, service, locationText, issueText, onDone, onBack }) {
  const circleScale = useRef(new Animated.Value(0)).current;
  const pulseRing1 = useRef(new Animated.Value(0)).current;
  const pulseRing2 = useRef(new Animated.Value(0)).current;
  const slideAnims = useRef([0, 1, 2].map(() => new Animated.Value(250))).current;

  const [customTimeText, setCustomTimeText] = useState("Today at 03:00 PM");

  const dateSlots = useMemo(() => {
    const slots = [];
    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      let dayLabel = i === 0 ? "Today" : i === 1 ? "Tomorrow" : daysOfWeek[d.getDay()];
      slots.push({
        dayName: dayLabel,
        dayNum: d.getDate(),
        month: months[d.getMonth()],
        fullString: `${i === 0 ? "Today" : i === 1 ? "Tomorrow" : daysOfWeek[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`,
        rawDate: d,
      });
    }
    return slots;
  }, []);

  const timeSlots = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
    "06:00 PM", "07:00 PM", "08:00 PM"
  ];

  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTimeIdx, setSelectedTimeIdx] = useState(7); // Default to 3:00 PM (idx 7)

  useEffect(() => {
    const dateObj = dateSlots[selectedDateIdx];
    const timeVal = timeSlots[selectedTimeIdx];
    if (dateObj && timeVal) {
      setCustomTimeText(`${dateObj.fullString} at ${timeVal}`);
    }
  }, [selectedDateIdx, selectedTimeIdx, dateSlots]);

  // Confetti points particles
  const particles = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      const startX = Math.random() * 100; // % width
      const delay = Math.random() * 1000;
      const duration = 2000 + Math.random() * 1200;
      const size = 5 + Math.random() * 6; // size 5 to 11
      const colors = [COLORS.success, COLORS.primary, COLORS.warning, COLORS.info, COLORS.violet];
      const color = colors[i % colors.length];

      const animY = new Animated.Value(0);
      const animX = new Animated.Value(0);

      return {
        id: i,
        startX,
        delay,
        duration,
        size,
        color,
        animY,
        animX,
      };
    });
  }, []);

  useEffect(() => {
    if (!biz) return;

    // Reset animations
    circleScale.setValue(0);
    pulseRing1.setValue(0);
    pulseRing2.setValue(0);
    slideAnims.forEach(a => a.setValue(250));

    // Spring circle in
    Animated.spring(circleScale, {
      toValue: 1, useNativeDriver: true, tension: 40, friction: 5,
    }).start();

    // Pulse rings loop
    Animated.parallel([
      Animated.loop(
        Animated.timing(pulseRing1, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(pulseRing2, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ])
      )
    ]).start();

    // Falling confetti drift
    particles.forEach(p => {
      p.animY.setValue(0);
      p.animX.setValue(0);

      Animated.parallel([
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.animY, {
            toValue: 1,
            duration: p.duration,
            useNativeDriver: true,
          })
        ]),
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.loop(
            Animated.sequence([
              Animated.timing(p.animX, {
                toValue: 12,
                duration: p.duration / 3,
                useNativeDriver: true,
              }),
              Animated.timing(p.animX, {
                toValue: -12,
                duration: p.duration / 3,
                useNativeDriver: true,
              }),
              Animated.timing(p.animX, {
                toValue: 0,
                duration: p.duration / 3,
                useNativeDriver: true,
              }),
            ])
          )
        ])
      ]).start();
    });

    // Staggered slide in follow-up cards
    slideAnims.forEach((anim, idx) => {
      Animated.sequence([
        Animated.delay(600 + idx * 180),
        Animated.spring(anim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        })
      ]).start();
    });
  }, [biz]);

  if (!biz) return null;

  const followUps = [
    {
      icon: "notifications-outline",
      when: "10 MIN BEFORE ARRIVAL",
      msg: `Your service provider is on the way. ${biz.name ? biz.name.split(" ")[0] : "Provider"} is 8 mins away.`,
    },
    { icon: "star-outline", when: "AFTER SERVICE", msg: `How did it go? Tap to rate ${biz.name || "Provider"}.` },
    { icon: "chatbubble-outline", when: "3 DAYS LATER", msg: "Hope everything went well! Need a follow-up visit?" },
  ];

  const receiptRows = [
    { label: "Service", value: service || biz.service_category || "—" },
    { label: "Problem", value: issueText || "Service required" },
    { label: "Provider", value: biz.name || "—" },
    { label: "When", value: customTimeText },
    { label: "Location", value: locationText || biz.address || "—" },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onBack}>
      <View style={tm.overlay}>
        <View style={tm.sheet}>
          <LinearGradient
            colors={[COLORS.warning + "22", "transparent"]}
            style={tm.glowBg}
            pointerEvents="none"
          />

          <View style={tm.handle} />

          {/* Confetti Particle Overlay */}
          {particles.map(p => {
            const translateY = p.animY.interpolate({
              inputRange: [0, 1],
              outputRange: [-30, 800],
            });
            const opacity = p.animY.interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [1, 1, 0],
            });
            return (
              <Animated.View
                key={p.id}
                style={{
                  position: "absolute",
                  left: `${p.startX}%`,
                  top: 0,
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  backgroundColor: p.color,
                  opacity,
                  transform: [
                    { translateY },
                    { translateX: p.animX },
                  ],
                  zIndex: 99,
                }}
                pointerEvents="none"
              />
            );
          })}

          {/* Header with Back Arrow */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: Platform.OS === "ios" ? 12 : 24,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.06)",
            width: "100%",
          }}>
            <TouchableOpacity onPress={onBack} style={{
              width: 36, height: 36, borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: COLORS.border,
              alignItems: "center", justifyContent: "center"
            }}>
              <Ionicons name="arrow-back" size={18} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "900", color: COLORS.text, marginLeft: 12 }}>Booking Details</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tm.scrollContent}>

            {/* Expanding Pulse Rings */}
            <View style={tm.circleWrapper}>
              <Animated.View
                style={[
                  tm.pulseRing,
                  {
                    borderColor: COLORS.warning,
                    transform: [
                      {
                        scale: pulseRing1.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2],
                        }),
                      },
                    ],
                    opacity: pulseRing1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 0],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  tm.pulseRing,
                  {
                    borderColor: COLORS.warning,
                    transform: [
                      {
                        scale: pulseRing2.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2],
                        }),
                      },
                    ],
                    opacity: pulseRing2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 0],
                    }),
                  },
                ]}
              />

              {/* Core animated success circle */}
              <Animated.View
                style={[
                  tm.circleMain,
                  {
                    backgroundColor: COLORS.warning,
                    shadowColor: COLORS.warning,
                    transform: [{ scale: circleScale }],
                  },
                ]}
              >
                <Ionicons name="time-outline" size={44} color="#fff" />
              </Animated.View>
            </View>

            <Text style={tm.outcomeTitle}>Booking Pending</Text>
            <Text style={tm.outcomeSub}>AI agent will contact the provider</Text>

            {/* Elegant Compact Scrolling Date & Time Selectors */}
            <View style={{ width: "100%", marginTop: 14, gap: 12 }}>
              
              {/* Date Selection (Ultra Compact Pill Row) */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6, paddingHorizontal: 2 }}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.primaryLight} />
                  <Text style={{ fontSize: 10, fontWeight: "900", color: "rgba(255, 255, 255, 0.7)", letterSpacing: 0.5, textTransform: "uppercase" }}>Select Date</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
                >
                  {dateSlots.map((d, idx) => {
                    const isSelected = selectedDateIdx === idx;
                    const dateText = idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : `${d.dayName}, ${d.month} ${d.dayNum}`;
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.85}
                        onPress={() => setSelectedDateIdx(idx)}
                        style={{
                          height: 34,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isSelected ? COLORS.primary : "rgba(255, 255, 255, 0.08)",
                          backgroundColor: isSelected ? "rgba(108, 99, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        <Text style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                        }}>
                          {dateText}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Time Selection (Ultra Compact Pill Row) */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6, paddingHorizontal: 2 }}>
                  <Ionicons name="time-outline" size={12} color={COLORS.success} />
                  <Text style={{ fontSize: 10, fontWeight: "900", color: "rgba(255, 255, 255, 0.7)", letterSpacing: 0.5, textTransform: "uppercase" }}>Select Time Slot</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
                >
                  {timeSlots.map((t, idx) => {
                    const isSelected = selectedTimeIdx === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.85}
                        onPress={() => setSelectedTimeIdx(idx)}
                        style={{
                          height: 34,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isSelected ? COLORS.success : "rgba(255, 255, 255, 0.08)",
                          backgroundColor: isSelected ? "rgba(16, 217, 160, 0.15)" : "rgba(255, 255, 255, 0.03)",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        <Text style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                        }}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

            </View>

            {/* Space before digital receipt card */}
            <View style={{ height: 16 }} />

            {/* Digital Perforated Ticket Card */}
            <View style={tm.receiptCard}>
              <View style={tm.receiptHeader}>
                <View>
                  <Text style={tm.receiptIdLabel}>BOOKING ID</Text>
                  <Text style={tm.receiptIdValue}>BK-NEW</Text>
                </View>
                <View style={[tm.statusPill, { backgroundColor: COLORS.warning + "15", borderColor: COLORS.warning + "44" }]}>
                  <Ionicons name="time-outline" size={11} color={COLORS.warning} style={{ marginRight: 3 }} />
                  <Text style={[tm.statusPillText, { color: COLORS.warning }]}>PENDING</Text>
                </View>
              </View>

              {/* Perforation Punch Hole Line */}
              <View style={tm.perforation}>
                <View style={[tm.perfCircle, { left: -24 }]} />
                <View style={[tm.perfCircle, { right: -24 }]} />
                <View style={tm.perfLine} />
              </View>

              {/* Receipt Details */}
              <View style={tm.receiptRows}>
                {receiptRows.map((r, i) => (
                  <View key={i} style={tm.receiptRow}>
                    <Text style={tm.receiptRowLabel}>{r.label}</Text>
                    <Text
                      style={[tm.receiptRowValue, r.label === "Total" && { color: COLORS.success, fontWeight: "900" }]}
                      numberOfLines={2}
                    >
                      {r.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* AI follow-ups scheduled section header */}
            <View style={tm.sectionHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={tm.purpleVerticalBar} />
                <Text style={tm.sectionTitle}>AI follow-ups scheduled</Text>
              </View>
              <View style={tm.geminiBadge}>
                <Ionicons name="sparkles" size={10} color={COLORS.violet} />
                <Text style={tm.geminiBadgeText}>GEMINI</Text>
              </View>
            </View>

            {/* Follow-up Cards */}
            <View style={{ gap: 10, width: "100%", marginTop: 8 }}>
              {followUps.map((f, i) => (
                <Animated.View
                  key={i}
                  style={[
                    tm.followupItem,
                    {
                      transform: [{ translateX: slideAnims[i] }],
                    },
                  ]}
                >
                  <View style={tm.followupIcon}>
                    <Ionicons name={f.icon} size={16} color={COLORS.violet} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={tm.followupWhen}>{f.when}</Text>
                    <Text style={tm.followupMsg}>{f.msg}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>

          </ScrollView>

          {/* Done Button */}
          <View style={tm.footer}>
            <TouchableOpacity
              onPress={() => onDone(customTimeText, "")}
              activeOpacity={0.85}
              style={tm.doneBtn}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.violet]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={tm.doneBtnGrad}
              >
                <Ionicons name="home-outline" size={18} color="#fff" />
                <Text style={tm.doneBtnText}>Confirm Booking & Go Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Service picker ────────────────────────────────────────────────────────────
// ── Service picker ────────────────────────────────────────────────────────────
function ServicePicker({ onStart, onBack, locationText, setLocationText, gpsLoading, selected, setSelected, issueText, setIssueText }) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Spin animation for sparkles spinner next to AI-READY
  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: true,
      })
    );
    spinLoop.start();
    return () => spinLoop.stop();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Pulse animation for Ask AI button glow
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const charsCount = issueText ? issueText.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.pickHeader}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.pickTitle}>Live Search Radar</Text>
            <Text style={s.pickSub}>Real providers · Google Maps data</Text>
          </View>
          <View style={s.liveChipWrap}>
            <View style={s.liveDotGreen} />
            <Text style={s.liveChipText}>LIVE</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.pickScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={s.sectionLabel}>SELECT A SERVICE CATEGORY</Text>
          <View style={s.catGrid}>
            {SERVICE_CATEGORIES.slice(0, 12).map(cat => (
              <Pressable
                key={cat.key}
                style={[s.catCard, selected === cat.label && { borderColor: cat.color, backgroundColor: cat.color + "18" }]}
                onPress={() => setSelected(cat.label)}
              >
                {selected === cat.label && (
                  <View style={[s.catCheck, { backgroundColor: cat.color }]}>
                    <Ionicons name="checkmark" size={9} color="#fff" />
                  </View>
                )}
                <View style={[s.catIcon, { backgroundColor: cat.color + "22", borderColor: cat.color + "44" }]}>
                  <Text style={{ fontSize: 15 }}>{cat.icon}</Text>
                </View>
                <Text style={[s.catLabel, selected === cat.label && { color: cat.color }]} numberOfLines={1}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* AI Console Card matching mockup exactly */}
          <Text style={s.sectionLabel}>AI SEARCH CONSOLE</Text>
          <View style={{
            backgroundColor: "rgba(18, 18, 38, 0.88)",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "rgba(139, 92, 246, 0.25)",
            padding: 18,
            marginBottom: 16,
            shadowColor: "#8B5CF6",
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 8,
          }}>
            {/* Header Badge */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="sparkles-outline" size={12} color="#A78BFA" />
              </Animated.View>
              <Text style={{ fontSize: 9.5, fontWeight: "900", color: "#A78BFA", letterSpacing: 1.2 }}>AI-READY</Text>
            </View>

            {/* Main Prompt Text Input */}
            <TextInput
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
                minHeight: 74,
                textAlignVertical: "top",
                padding: 0,
                lineHeight: 22,
              }}
              value={issueText}
              onChangeText={setIssueText}
              placeholder={selected ? `Describe your ${selected.toLowerCase()} issue... (e.g. leaking sink)` : "Select a service category and describe your issue here..."}
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
            />

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 14 }} />

            {/* Bottom Actions Row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              {/* Tool buttons */}
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TouchableOpacity style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center"
                }} activeOpacity={0.7} onPress={() => {
                  setSelected("Plumber");
                  setIssueText("My kitchen sink is leaking badly and I need a plumber in DHA Phase 6 today");
                }}>
                  <Ionicons name="mic-outline" size={16} color="rgba(255,255,255,0.65)" />
                </TouchableOpacity>

                <TouchableOpacity style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center"
                }} activeOpacity={0.7}>
                  <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.65)" />
                </TouchableOpacity>

                <TouchableOpacity style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center"
                }} activeOpacity={0.7}>
                  <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.65)" />
                </TouchableOpacity>

                <Text style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginLeft: 6 }}>
                  {charsCount} chars · Gemini ready
                </Text>
              </View>

              {/* Glowing gradient Ask AI Button */}
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={{ borderRadius: 14, overflow: "hidden", opacity: selected ? 1 : 0.4 }}
                  onPress={() => selected && onStart()}
                  activeOpacity={0.8}
                  disabled={!selected}
                >
                  <LinearGradient
                    colors={["#8B5CF6", "#6366F1"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 11 }}
                  >
                    <Ionicons name="arrow-forward" size={14} color="#FFF" />
                    <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "800" }}>Ask AI</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Location details card */}
          <Text style={s.sectionLabel}>YOUR SEARCH LOCATION</Text>
          <View style={s.locRow}>
            <View style={[s.gpsIcon, gpsLoading
              ? { backgroundColor: COLORS.warningGlow, borderColor: COLORS.warning + "55" }
              : { backgroundColor: COLORS.successGlow, borderColor: COLORS.success + "55" }]}>
              <Ionicons name={gpsLoading ? "time-outline" : "location"} size={15} color={gpsLoading ? COLORS.warning : COLORS.success} />
            </View>
            <TextInput
              style={s.locInput}
              value={locationText}
              onChangeText={setLocationText}
              placeholder="Area, City (e.g. Gulberg, Lahore)"
              placeholderTextColor={COLORS.textDim}
            />
            {!gpsLoading && (
              <View style={s.gpsBadge}>
                <Text style={s.gpsBadgeText}>GPS</Text>
              </View>
            )}
          </View>

          <View style={s.noteBox}>
            <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
            <Text style={s.noteText}>Scans real Google Maps data · Results in 3-8 minutes</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function LiveSearchScreen({ navigation }) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();

  const HEADER_H = insets.top + 58;
  const cx = W / 2;
  const cy = H * 0.45;
  const radius = Math.min(W, H) * 0.38;
  const maxR = Math.min(W, H) * 0.46;
  const DELTA = 0.04; // degrees — half-span of viewbox

  const [phase, setPhase] = useState("pick");
  const [service, setService] = useState("");
  const [problemDetails, setProblemDetails] = useState("");
  const [locText, setLocText] = useState("Detecting...");
  const [gpsLoad, setGpsLoad] = useState(true);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [nearbyLabels, setNearbyLabels] = useState([]);
  const [fakeFound, setFakeFound] = useState(0);
  const [businesses, setBiz] = useState([]);
  const [report, setReport] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePin, setActivePin] = useState(null);
  const [beams, setBeams] = useState([]);
  const [errorMsg, setError] = useState("");
  const [bookingBiz, setBookingBiz] = useState(null);

  const sweepAnim = useRef(new Animated.Value(0)).current;
  const r0 = useRef(new Animated.Value(0)).current;
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;
  const haloAnim = useRef(new Animated.Value(0.8)).current;
  const sheetAnim = useRef(new Animated.Value(420)).current;
  const timersRef = useRef([]);
  const beamRefs = useRef({});

  // GPS + nearby labels on mount
  useEffect(() => {
    (async () => {
      const coords = await tryGetCoords();
      if (coords) {
        setGpsCoords(coords);
        const loc = await reverseGeocode(coords.lat, coords.lng);
        setLocText(loc);
        // Fetch nearby places for radar labels (non-blocking)
        fetchNearbyPlaces(coords.lat, coords.lng).then(places => {
          const labels = mapPlacesToLabels(places, coords, cx, cy, W, H, maxR, HEADER_H, DELTA);
          setNearbyLabels(labels);
        }).catch(() => {
          setNearbyLabels(mapPlacesToLabels([], null, cx, cy, W, H, maxR, HEADER_H, DELTA));
        });
      } else {
        setLocText("Karachi");
        setNearbyLabels(mapPlacesToLabels([], null, cx, cy, W, H, maxR, HEADER_H, DELTA));
      }
      setGpsLoad(false);
    })();
  }, []);

  // Radar animations when entering map phase
  useEffect(() => {
    if (phase === "pick") return;
    const isWeb = Platform.OS === "web";
    const sweepLoop = Animated.loop(
      Animated.timing(sweepAnim, { toValue: 1, duration: 3200, useNativeDriver: !isWeb })
    );
    sweepLoop.start();
    const haloLoop = Animated.loop(Animated.sequence([
      Animated.timing(haloAnim, { toValue: 1.5, duration: 1600, useNativeDriver: !isWeb }),
      Animated.timing(haloAnim, { toValue: 0.8, duration: 1600, useNativeDriver: !isWeb }),
    ]));
    haloLoop.start();
    const ringSpeed = 2600;
    const ringLoops = [r0, r1, r2, r3].map((ring, i) => {
      ring.setValue(0);
      const l = Animated.loop(Animated.sequence([
        Animated.delay(i * ringSpeed / 4),
        Animated.timing(ring, { toValue: 1, duration: ringSpeed, useNativeDriver: !isWeb }),
        Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: !isWeb }),
      ]));
      l.start();
      return l;
    });
    return () => {
      sweepLoop.stop();
      haloLoop.stop();
      ringLoops.forEach(l => l.stop());
    };
  }, [phase === "pick"]);

  const addBeam = (px, py) => {
    const id = Math.random();
    const anim = new Animated.Value(1);
    beamRefs.current[id] = anim;
    setBeams(prev => [...prev, { id, x: px, y: py, anim }]);
    Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
      setBeams(prev => prev.filter(b => b.id !== id));
      delete beamRefs.current[id];
    });
  };

  const openSheet = () => {
    setSheetOpen(true);
    Animated.spring(sheetAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
  };
  const closeSheet = () => {
    Animated.spring(sheetAnim, { toValue: 420, friction: 8, useNativeDriver: true }).start(() => setSheetOpen(false));
  };

  const startScan = async () => {
    setPhase("scanning");
    setFakeFound(0);
    setBiz([]);
    setReport(null);
    setSheetOpen(false);
    setActivePin(null);
    setBeams([]);
    setError("");
    sheetAnim.setValue(420);

    // Fake progressive pin drops — pace 700ms, open sheet at 5
    timersRef.current.forEach(clearTimeout);
    const pinPositions = PIN_OFFSETS.map(o => ({ px: cx + o.rx * radius, py: cy + o.ry * radius }));
    for (let i = 1; i <= PIN_OFFSETS.length; i++) {
      timersRef.current.push(setTimeout(() => {
        setFakeFound(f => Math.max(f, i));
        if (i === 5) openSheet();
        const pin = pinPositions[i - 1];
        if (pin) addBeam(pin.px, pin.py);
      }, i * 700));
    }

    try {
      const result = await API.findBusiness(service.trim(), locText.trim());
      const biz = result?.businesses || [];
      setBiz(biz);
      setReport(result?.report || null);
      setFakeFound(f => Math.max(f, biz.length));
      setPhase("results");
      openSheet();
    } catch (e) {
      timersRef.current.forEach(clearTimeout);
      setError(e.message || "Search failed. Please try again.");
      setPhase("error");
    }
  };

  const rescan = () => {
    timersRef.current.forEach(clearTimeout);
    setPhase("pick");
    setFakeFound(0);
    setSheetOpen(false);
    setBiz([]);
    setReport(null);
    sheetAnim.setValue(420);
  };

  const sweepDeg = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const rings = [r0, r1, r2, r3].map(r => ({
    scale: r.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    opacity: r.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.85, 0.4, 0] }),
  }));
  const displayCount = businesses.length > 0 ? businesses.length : fakeFound;
  const pinPositions = PIN_OFFSETS.map(o => ({ px: cx + o.rx * radius, py: cy + o.ry * radius }));

  if (phase === "pick") {
    return (
      <ServicePicker
        onBack={() => navigation.goBack()}
        onStart={startScan}
        locationText={locText}
        setLocationText={setLocText}
        gpsLoading={gpsLoad}
        selected={service}
        setSelected={setService}
        issueText={problemDetails}
        setIssueText={setProblemDetails}
      />
    );
  }

  if (phase === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="alert-circle-outline" size={52} color={COLORS.danger} />
        <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.text, marginTop: 16, marginBottom: 8 }}>Search Failed</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>{errorMsg}</Text>
        <TouchableOpacity onPress={rescan} style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ color: COLORS.primary, fontWeight: "700" }}>← Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#070710" }}>
      {/* Map */}
      <MapBackground width={W} height={H} nearbyLabels={nearbyLabels} locText={locText} />

      {/* Radar */}
      <RadarOverlay cx={cx} cy={cy} maxR={maxR} active sweepDeg={sweepDeg} rings={rings} />

      {/* Discovery beams */}
      {beams.map(b => {
        const dx = b.x - cx, dy = b.y - cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <Animated.View
            key={b.id}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (cx + b.x) / 2 - len / 2,
              top: (cy + b.y) / 2 - 1,
              width: len, height: 2,
              backgroundColor: COLORS.success,
              opacity: b.anim,
              transform: [{ rotate: `${ang}deg` }],
            }}
          />
        );
      })}

      {/* User pin */}
      <UserPin cx={cx} cy={cy} haloScale={haloAnim} />

      {/* Shop pins */}
      {pinPositions.slice(0, displayCount).map((pos, i) => (
        <ShopPin
          key={i}
          x={pos.px} y={pos.py}
          index={i}
          label={businesses[i]?.name || `Provider ${i + 1}`}
          dist={businesses[i]?.distance_km != null ? businesses[i].distance_km : ((i + 1) * 0.65).toFixed(1)}
          active={activePin === i}
          onPress={() => { setActivePin(i); openSheet(); }}
        />
      ))}

      {/* Map controls (Unified elegant vertical pill card matching mockup) */}
      <View style={[s.mapControls, { top: HEADER_H + 8 }]}>
        <View style={s.controlsCard}>
          {["navigate-outline", "layers-outline", "add", "remove"].map((icon, i) => (
            <TouchableOpacity key={i} style={s.controlsBtn} activeOpacity={0.7}>
              <Ionicons name={icon} size={15} color={COLORS.text} />
              {i < 3 && <View style={s.controlsDivider} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Compass */}
      <View style={[s.compass, { top: HEADER_H + 8 }]}>
        <View style={{ position: "relative", width: 28, height: 28 }}>
          <View style={{ position: "absolute", left: 12, top: 0, width: 2, height: 12, backgroundColor: COLORS.danger, borderRadius: 1 }} />
          <View style={{ position: "absolute", left: 12, bottom: 0, width: 2, height: 12, backgroundColor: COLORS.textSecondary, borderRadius: 1, opacity: 0.5 }} />
          <View style={{ position: "absolute", left: 11, top: 11, width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.text }} />
          <Text style={{ position: "absolute", top: -7, left: 7, fontSize: 7, color: COLORS.danger, fontWeight: "900" }}>N</Text>
        </View>
      </View>

      {/* Scale bar */}
      <View style={[s.scale, { bottom: 92 }]}>
        <View style={{ width: 30, height: 2, backgroundColor: COLORS.textSecondary, marginRight: 6 }} />
        <Text style={{ fontSize: 9, color: COLORS.textSecondary, fontWeight: "700", letterSpacing: 0.4 }}>500 m</Text>
      </View>

      {/* Glass header */}
      <View style={[s.glassHeaderWrap, { paddingTop: insets.top }]}>
        <View style={s.glassHeader}>
          <TouchableOpacity onPress={rescan} style={s.glassBack}>
            <Ionicons name="chevron-back" size={14} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.glassTitle} numberOfLines={1}>{service} · {locText}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              {phase === "scanning"
                ? <><View style={s.liveDotGreen} /><Text style={s.glassSub}>Scanning radar area...</Text></>
                : <><Ionicons name="checkmark-circle" size={10} color={COLORS.success} /><Text style={s.glassSub}>{displayCount} live providers near you</Text></>
              }
            </View>
          </View>
          <TouchableOpacity onPress={rescan} style={s.rescanBtn}>
            <Text style={s.rescanText}>Re-scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom sheet */}
      <BottomSheet
        sheetAnim={sheetAnim}
        found={fakeFound}
        businesses={businesses}
        locationText={locText}
        report={report}
        active={activePin}
        setActive={setActivePin}
        onClose={closeSheet}
        phase={phase}
        onBook={(biz) => setBookingBiz(biz)}
      />

      {/* Booking Pending Overlay */}
      {bookingBiz && (
        <BookingPendingOverlay
          biz={bookingBiz}
          service={service}
          locationText={locText}
          issueText={problemDetails}
          onBack={() => setBookingBiz(null)}
          onDone={(date, time) => {
            API.initiateCall({
              provider_phone: toE164(bookingBiz?.phone),
              provider_name: bookingBiz?.name || "Provider",
              user_name: userProfile?.name || "Customer",
              user_address: locText || bookingBiz?.address || "",
              problem: problemDetails || service || "Service required",
              service_type: service || "Service",
              preferred_time: time ? `${date} at ${time}` : date,
              language: "ur",
              user_phone: userProfile?.phone || null,
              booking_id: null,
              user_id: userProfile?.uid || null,
            }).catch(() => { });
            setBookingBiz(null);
            navigation.navigate("UserTabs", { screen: "Home" });
          }}
        />
      )}

      {/* Floating pill */}
      {!sheetOpen && displayCount > 0 && (
        <View style={[s.floatingPillWrap, { bottom: 92 }]} pointerEvents="box-none">
          <TouchableOpacity onPress={openSheet} activeOpacity={0.9} style={s.floatingPill}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.floatingPillGrad}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger }} />
              <Text style={s.floatingPillText}>View results</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Stunning Glassmorphic Bottom Navigation Tab Bar overlay matching global tabs exactly */}
      <View style={s.bottomTab}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={s.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("UserTabs", { screen: "Home" })}
        >
          <Ionicons name="home-outline" size={22} color={COLORS.textMuted} />
          <Text style={s.tabLabel}>Home</Text>
        </TouchableOpacity>

        {/* Tab 2: Bookings */}
        <TouchableOpacity
          style={s.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("UserTabs", { screen: "BookingHistory" })}
        >
          <Ionicons name="receipt-outline" size={22} color={COLORS.textMuted} />
          <Text style={s.tabLabel}>Bookings</Text>
        </TouchableOpacity>

        {/* Tab 3: Centered Ask AI (Active glowing violet sparkles button) */}
        <View style={s.tabCenterContainer}>
          <TouchableOpacity
            style={[s.tabCenterButton, {
              backgroundColor: COLORS.violet || "#8B5CF6",
              shadowColor: COLORS.violet || "#8B5CF6",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.65,
              shadowRadius: 14,
              elevation: 10,
              borderWidth: 3,
              borderColor: "#070710",
            }]}
            activeOpacity={0.85}
            onPress={rescan}
          >
            <LinearGradient
              colors={["#8B5CF6", "#6366F1"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.tabCenterGrad}
            >
              <Ionicons name="sparkles" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tab 4: Inbox (Notifications) */}
        <TouchableOpacity
          style={s.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("UserTabs", { screen: "Notifications" })}
        >
          <Ionicons name="notifications-outline" size={22} color={COLORS.textMuted} />
          <Text style={s.tabLabel}>Inbox</Text>
        </TouchableOpacity>

        {/* Tab 5: Profile */}
        <TouchableOpacity
          style={s.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("UserTabs", { screen: "Profile" })}
        >
          <Ionicons name="person-circle-outline" size={22} color={COLORS.textMuted} />
          <Text style={s.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Picker
  pickHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  pickTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  pickSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  liveChipWrap: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.successGlow, borderWidth: 1, borderColor: COLORS.success + "44", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  liveChipText: { fontSize: 9, color: COLORS.success, fontWeight: "800", letterSpacing: 0.8 },
  pickScroll: { padding: 18, paddingTop: 4, paddingBottom: 40 },
  sectionLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 1.4, marginBottom: 12, marginTop: 8 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  catCard: { width: "30.5%", backgroundColor: COLORS.card, borderRadius: 14, padding: 10, alignItems: "center", gap: 7, borderWidth: 1, borderColor: COLORS.border, position: "relative" },
  catCheck: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 11, fontWeight: "600", color: COLORS.textMuted, textAlign: "center" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 20 },
  gpsIcon: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  locInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10 },
  gpsBadge: { backgroundColor: COLORS.successGlow, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.success + "44" },
  gpsBadgeText: { fontSize: 9, color: COLORS.success, fontWeight: "800" },
  startBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 16, shadowColor: COLORS.success, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  startBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  noteText: { flex: 1, fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  // Glass header
  glassHeaderWrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 },
  glassHeader: { margin: 12, marginTop: 4, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(13,13,28,0.88)", borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 10, shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 12, elevation: 8 },
  glassBack: { width: 30, height: 30, borderRadius: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  glassTitle: { fontSize: 12.5, fontWeight: "800", color: COLORS.text },
  glassSub: { fontSize: 9.5, color: COLORS.textSecondary },
  rescanBtn: { height: 30, paddingHorizontal: 10, borderRadius: 9, backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.primary + "66", alignItems: "center", justifyContent: "center" },
  rescanText: { fontSize: 10, fontWeight: "700", color: COLORS.primaryLight },
  // Map controls
  mapControls: { position: "absolute", right: 12, gap: 6 },
  mapBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(13,13,28,0.88)", borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 6, elevation: 4, marginBottom: 6 },
  compass: { position: "absolute", left: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(13,13,28,0.88)", borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  scale: { position: "absolute", bottom: 100, left: 12, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(13,13,28,0.72)", borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  liveDotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  // Floating pill
  floatingPillWrap: { position: "absolute", bottom: 28, left: 0, right: 0, alignItems: "center", zIndex: 35 },
  floatingPill: { borderRadius: 999, overflow: "hidden", shadowColor: COLORS.primary, shadowOpacity: 0.55, shadowRadius: 14, elevation: 8 },
  floatingPillGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  floatingPillText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  // Sheet
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: 440, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "rgba(13,13,28,0.97)", borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.borderLight, shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 20, elevation: 10, zIndex: 50 },
  sheetHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sheetCount: { fontSize: 24, fontWeight: "900", color: COLORS.text, letterSpacing: -0.8 },
  sheetCountSub: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "600" },
  sheetSub: { fontSize: 10.5, color: COLORS.textSecondary },
  closeBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  scanningBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  scanningText: { fontSize: 11, color: COLORS.textSecondary },
  lookingContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(16, 217, 160, 0.08)", borderWidth: 1, borderColor: "rgba(16, 217, 160, 0.2)", borderRadius: 14, paddingVertical: 12, marginBottom: 10, marginTop: 6 },
  lookingText: { fontSize: 13, fontWeight: "700", color: COLORS.success, letterSpacing: 0.5 },
  skeletonCard: { flexDirection: "row", backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12, alignItems: "center" },
  skeletonRank: { width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)" },
  skeletonName: { width: "55%", height: 12, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)" },
  skeletonAddr: { width: "80%", height: 9, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.04)", marginTop: 6 },
  skeletonMeta: { width: 44, height: 9, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.04)" },
  // AI Analysis Card
  analysisCard: { marginBottom: 14, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: COLORS.primary + "44", backgroundColor: COLORS.card },
  analysisHeader: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, paddingBottom: 10 },
  analysisIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  analysisTitle: { fontSize: 11, fontWeight: "900", color: COLORS.primary, letterSpacing: 0.8 },
  analysisMeta: { fontSize: 9, color: COLORS.textMuted, marginTop: 1 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.successGlow, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.success + "44" },
  liveBadgeText: { fontSize: 8, color: COLORS.success, fontWeight: "800", letterSpacing: 0.5 },
  topPickRow: { paddingHorizontal: 10, paddingBottom: 10 },
  topPickGrad: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: COLORS.success + "33" },
  topPickIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.success + "22", borderWidth: 1, borderColor: COLORS.success + "44", alignItems: "center", justifyContent: "center" },
  topPickLabel: { fontSize: 8, color: COLORS.success, fontWeight: "800", letterSpacing: 1, marginBottom: 2 },
  topPickName: { fontSize: 13, fontWeight: "900", color: COLORS.text },
  rankOne: { backgroundColor: COLORS.success, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, marginLeft: "auto" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingBottom: 10 },
  providerChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.surface, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border, maxWidth: "47%" },
  chipText: { fontSize: 9, color: COLORS.textMuted, fontWeight: "600", flex: 1 },
  analysisDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 12, marginBottom: 10 },
  analysisText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 19, paddingHorizontal: 12, paddingBottom: 4 },
  expandBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 12, paddingTop: 8 },
  expandText: { fontSize: 11, color: COLORS.primary, fontWeight: "700" },
  // Business cards
  bizCard: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 14, marginBottom: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  bizCardActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary },
  rankBadge: { width: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center", flexShrink: 0, elevation: 4 },
  rankNum: { color: "#fff", fontSize: 13, fontWeight: "900" },
  bizName: { fontSize: 13, fontWeight: "800", color: COLORS.text, flex: 1 },
  bizRating: { fontSize: 11, fontWeight: "700", color: COLORS.warning },
  bizAddr: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  bizDist: { fontSize: 10, color: COLORS.success, fontWeight: "700" },
  bizReviews: { fontSize: 10, color: COLORS.textMuted },
  callBtn: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.success, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  callText: { fontSize: 9, color: "#fff", fontWeight: "700" },

  // Unified Map Controls Card
  controlsCard: {
    backgroundColor: "rgba(13,13,28,0.88)",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    width: 36,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  controlsBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  controlsDivider: {
    position: "absolute",
    bottom: 0,
    left: 4,
    right: 4,
    height: 0.8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  // Custom premium bottom tab styles
  bottomTab: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    flexDirection: "row",
    backgroundColor: "rgba(7,7,16,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 40,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    height: "100%",
  },
  tabItemActive: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    height: "100%",
    position: "relative",
  },
  tabActiveBar: {
    position: "absolute",
    top: 0,
    width: 24,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: COLORS.success,
  },
  tabCenterContainer: {
    width: 68,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  tabCenterButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: "hidden",
    marginTop: -28,
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
  tabCenterGrad: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
});

const tm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: COLORS.borderLight, maxHeight: "92%", paddingBottom: 24,
    position: "relative", overflow: "hidden",
  },
  glowBg: { position: "absolute", top: 0, left: 0, right: 0, height: 160 },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.borderLight, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  centered: { alignItems: "center", padding: 40 },
  scrollContent: { alignItems: "center", padding: 24, paddingBottom: 130, width: "100%" },
  loadingText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8 },

  circleWrapper: { width: 140, height: 140, alignItems: "center", justifyContent: "center", marginVertical: 10, position: "relative" },
  pulseRing: { position: "absolute", width: 92, height: 92, borderRadius: 46, borderWidth: 2 },
  circleMain: { width: 92, height: 92, borderRadius: 46, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 8 },

  outcomeTitle: { fontSize: 24, fontWeight: "900", color: COLORS.text, marginTop: 8, letterSpacing: -0.6, textAlign: "center" },
  outcomeSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", marginTop: 6, marginBottom: 20 },

  receiptCard: { width: "100%", backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.borderLight, padding: 16, position: "relative", overflow: "hidden" },
  receiptHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  receiptIdLabel: { fontSize: 9, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1.2 },
  receiptIdValue: { fontSize: 14, fontWeight: "800", color: COLORS.text, fontFamily: "Courier New", marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: "800" },

  perforation: { flexDirection: "row", alignItems: "center", height: 16, marginVertical: 14, position: "relative" },
  perfCircle: { position: "absolute", width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.bg, zIndex: 5 },
  perfLine: { flex: 1, borderStyle: "dashed", borderWidth: 1, borderColor: COLORS.borderLight, height: 0 },

  receiptRows: { gap: 10 },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  receiptRowLabel: { fontSize: 12, color: COLORS.textSecondary },
  receiptRowValue: { fontSize: 12, fontWeight: "700", color: COLORS.text, textAlign: "right", flex: 1 },

  suggestedBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, marginTop: 14, borderWidth: 1, borderColor: COLORS.warning + "44", width: "100%" },
  suggestedLabel: { fontSize: 9, fontWeight: "800", color: COLORS.warning, letterSpacing: 1.2, marginBottom: 2 },
  suggestedValue: { fontSize: 15, fontWeight: "900", color: COLORS.warning },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 24, marginBottom: 8 },
  purpleVerticalBar: { width: 3, height: 14, backgroundColor: COLORS.violet, borderRadius: 2 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  geminiBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.violet + "15", borderWidth: 1, borderColor: COLORS.violet + "33", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  geminiBadgeText: { fontSize: 9, fontWeight: "800", color: COLORS.violet, letterSpacing: 0.5 },

  followupItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12, width: "100%" },
  followupIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.violet + "18", borderWidth: 1, borderColor: COLORS.violet + "44", alignItems: "center", justifyContent: "center" },
  followupWhen: { fontSize: 9, fontWeight: "800", color: COLORS.violet, letterSpacing: 0.6 },
  followupMsg: { fontSize: 12, color: COLORS.text, marginTop: 2, lineHeight: 16 },

  transcriptBox: { width: "100%", backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginTop: 14 },
  transcriptLabel: { fontSize: 8, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: 6 },
  transcriptText: { fontSize: 10.5, color: COLORS.textSecondary, lineHeight: 16, fontFamily: "Courier New" },

  footer: { paddingHorizontal: 20, paddingTop: 12, width: "100%", paddingBottom: 24 },
  doneBtn: { width: "100%", borderRadius: 16, overflow: "hidden" },
  doneBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
