import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";

const { height: SH } = Dimensions.get("window");
export const MAP_HEIGHT = Math.min(Math.round(SH * 0.40), 265);

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  radar:    "#6C63FF",
  userBlue: "#4285F4",
  pin:      "#EF4444",
  pinGold:  "#F59E0B",
  bg:       "#05050f",
  success:  "#34D399",
  text:     "#C8C8E0",
  pillBg:   "#05050fDD",
};

// ── Dark Google Maps style ───────────────────────────────────────────────────
const DARK_MAP_STYLE = [
  { elementType: "geometry",                      stylers: [{ color: "#08081a" }] },
  { elementType: "labels.text.fill",              stylers: [{ color: "#4a4a6a" }] },
  { elementType: "labels.text.stroke",            stylers: [{ color: "#08081a" }] },
  { featureType: "road",         elementType: "geometry",         stylers: [{ color: "#131330" }] },
  { featureType: "road",         elementType: "geometry.stroke",  stylers: [{ color: "#0d0d22" }] },
  { featureType: "road.highway", elementType: "geometry",         stylers: [{ color: "#1e1e48" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#5a5a8a" }] },
  { featureType: "water",        elementType: "geometry",         stylers: [{ color: "#02020e" }] },
  { featureType: "poi",          stylers: [{ visibility: "off" }] },
  { featureType: "transit",      elementType: "geometry",         stylers: [{ color: "#0a0a1c" }] },
  { featureType: "landscape",    elementType: "geometry",         stylers: [{ color: "#0a0a1c" }] },
  { featureType: "poi.park",     elementType: "geometry",         stylers: [{ color: "#080e08" }] },
  { featureType: "administrative", elementType: "geometry",       stylers: [{ color: "#1a1a3a" }] },
];

// ── Radar pulse ring ─────────────────────────────────────────────────────────
function RadarRing({ delay }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1, duration: 2600, delay,
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished && alive) loop(); });
    };
    loop();
    return () => { alive = false; anim.stopAnimation(); };
  }, []);

  const scale   = anim.interpolate({ inputRange: [0, 1],              outputRange: [0.05, 5.8] });
  const opacity = anim.interpolate({ inputRange: [0, 0.18, 0.6, 1],   outputRange: [0,    0.95, 0.35, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 1.5, borderColor: C.radar,
        opacity, transform: [{ scale }],
      }}
    />
  );
}

// ── User location dot with breathing ring ────────────────────────────────────
function UserDot() {
  const breath = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 2.4, duration: 1100, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 1,   duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ width: 28, height: 28, justifyContent: "center", alignItems: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: 22, height: 22, borderRadius: 11,
          borderWidth: 1.5, borderColor: C.userBlue + "70",
          transform: [{ scale: breath }],
        }}
      />
      <View style={s.userCore} />
    </View>
  );
}

// ── Provider pin: numbered, spring-in ───────────────────────────────────────
function ProviderPin({ provider, index }) {
  const scale  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(-18)).current;
  const [tracking, setTracking] = useState(true);

  const isFirst  = index === 0;
  const pinColor = isFirst ? C.pinGold : C.pin;
  const size     = isFirst ? 32 : 27;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,  { toValue: 1, friction: 4, tension: 200, delay: index * 220, useNativeDriver: false }),
      Animated.spring(slideY, { toValue: 0, friction: 5, tension: 220, delay: index * 220, useNativeDriver: false }),
    ]).start(() => setTracking(false));
  }, []);

  return (
    <Marker
      coordinate={{ latitude: provider.lat, longitude: provider.lng }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracking}
    >
      <Animated.View style={{ alignItems: "center", transform: [{ scale }, { translateY: slideY }] }}>
        {isFirst && (
          <View style={{
            position: "absolute", top: -8,
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: C.pinGold + "25",
          }} />
        )}
        <View style={[
          s.pinCircle,
          { backgroundColor: pinColor, width: size, height: size, borderRadius: size / 2 },
        ]}>
          <Text style={[s.pinNum, { fontSize: isFirst ? 12 : 10 }]}>{index + 1}</Text>
        </View>
        <View style={[s.pinTip, { borderTopColor: pinColor }]} />
      </Animated.View>
    </Marker>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
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

// ── Main export ───────────────────────────────────────────────────────────────
export default function MapSearchOverlay({ userCoords, providers = [], isSearching = true }) {
  const DEFAULT = { lat: 31.5204, lng: 74.3587 }; // Lahore
  const center  = userCoords ?? DEFAULT;

  // Normalise provider coords — spread around center when missing
  const pins = providers.slice(0, 8).map((p, i) => {
    const lat = parseFloat(p.lat ?? p.latitude ?? 0);
    const lng = parseFloat(p.lng ?? p.longitude ?? 0);
    const angle = (i / 8) * 2 * Math.PI;
    return {
      ...p,
      lat: lat || center.lat + Math.cos(angle) * 0.014 + (Math.random() - 0.5) * 0.006,
      lng: lng || center.lng + Math.sin(angle) * 0.014 + (Math.random() - 0.5) * 0.006,
    };
  });

  return (
    <View style={s.map}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude:       center.lat,
          longitude:      center.lng,
          latitudeDelta:  0.048,
          longitudeDelta: 0.048,
        }}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        rotateEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={{ latitude: center.lat, longitude: center.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <UserDot />
        </Marker>

        {pins.map((p, i) => (
          <ProviderPin key={`pin-${i}`} provider={p} index={i} />
        ))}
      </MapView>

      {/* Radar rings overlay — centred on map (map is centred on user) */}
      {isSearching && (
        <View style={s.radarLayer} pointerEvents="none">
          {[0, 650, 1300, 1950].map((d, i) => (
            <RadarRing key={i} delay={d} />
          ))}
        </View>
      )}

      {/* Corner watermark */}
      <View style={s.brand} pointerEvents="none">
        <Text style={s.brandText}>✦ ServiceAI</Text>
      </View>

      <StatusBadge isSearching={isSearching} count={pins.length} />
    </View>
  );
}

const s = StyleSheet.create({
  map: {
    width: "100%", height: MAP_HEIGHT,
    borderRadius: 18, overflow: "hidden",
    backgroundColor: C.bg,
  },
  radarLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center", alignItems: "center",
  },
  userCore: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: C.userBlue,
    borderWidth: 2.5, borderColor: "#fff",
    shadowColor: C.userBlue, shadowOpacity: 1, shadowRadius: 10, elevation: 10,
  },
  pinCircle: {
    justifyContent: "center", alignItems: "center",
    borderWidth: 2.5, borderColor: "#fff",
    shadowColor: "#EF4444", shadowOpacity: 0.9, shadowRadius: 8, elevation: 12,
  },
  pinNum: { color: "#fff", fontWeight: "800" },
  pinTip: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 9,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    marginTop: -1,
  },
  statusWrap: {
    position: "absolute", bottom: 14, left: 0, right: 0,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: C.pillBg,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1, borderColor: C.radar + "55",
  },
  pillDone: { borderColor: C.success + "55", backgroundColor: "#03100aDD" },
  pillText:  { fontSize: 12, color: C.text, fontWeight: "600", letterSpacing: 0.2 },
  blip: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.radar,
    shadowColor: C.radar, shadowOpacity: 1, shadowRadius: 6, elevation: 4,
  },
  brand: {
    position: "absolute", top: 12, right: 14,
    backgroundColor: "#05050fAA",
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: C.radar + "33",
  },
  brandText: { fontSize: 9, color: C.radar, fontWeight: "700", letterSpacing: 0.5 },
});
