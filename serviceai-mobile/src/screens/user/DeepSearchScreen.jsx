import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Animated, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../services/api";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";

function BusinessCard({ biz, index, delay = 0 }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const rankColors = [
    ["#92701A", "#D4A017"],
    ["#606060", "#A8A8A8"],
    ["#5C3010", "#9E6030"],
  ];
  const rankGrad = rankColors[index] || rankColors[2];

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 14 }}>
      <View style={[styles.bizCard, index === 0 && styles.bizCardGold]}>
        {index === 0 && (
          <LinearGradient colors={["rgba(255,215,0,0.06)", "transparent"]} style={styles.cardShimmer} />
        )}

        <View style={styles.bizHeader}>
          <LinearGradient colors={rankGrad} style={styles.rankBadge}>
            <Text style={styles.rankText}>#{index + 1}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.bizName}>{biz.name}</Text>
            <View style={styles.sourceChip}>
              <Ionicons name="globe-outline" size={9} color={COLORS.info} />
              <Text style={styles.sourceChipText}>Google Maps</Text>
            </View>
          </View>
          {biz.rating != null && (
            <View style={styles.ratingWrap}>
              <Ionicons name="star" size={14} color={COLORS.warning} />
              <Text style={styles.ratingText}>{biz.rating}</Text>
              {biz.reviews_count != null && (
                <Text style={styles.reviewsText}>({biz.reviews_count})</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.bizDivider} />

        {biz.address ? (
          <View style={styles.bizInfoRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.bizInfoText}>{biz.address}</Text>
          </View>
        ) : null}

        {biz.distance_km != null && (
          <View style={styles.bizInfoRow}>
            <Ionicons name="navigate-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.bizInfoText}>{biz.distance_km} km away</Text>
          </View>
        )}

        {biz.score != null && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Match Score</Text>
            <View style={styles.scoreRight}>
              <Text style={styles.scoreNum}>{Math.round(biz.score)}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>
        )}

        {biz.reason ? (
          <View style={styles.reasonBox}>
            <View style={styles.reasonHeader}>
              <Text style={styles.reasonLabel}>🤖 AI Reasoning</Text>
              <View style={styles.geminiChip}>
                <Text style={styles.geminiChipText}>Gemini</Text>
              </View>
            </View>
            <Text style={styles.reasonText}>"{biz.reason}"</Text>
          </View>
        ) : null}

        <View style={styles.bizActions}>
          {biz.phone ? (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${biz.phone.replace(/[\s\-()]/g, "")}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={14} color="#fff" />
              <Text style={styles.callBtnText}>{biz.phone}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noPhone}>
              <Ionicons name="call-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.noPhoneText}>No phone available</Text>
            </View>
          )}
          {biz.website ? (
            <TouchableOpacity
              style={styles.webBtn}
              onPress={() => Linking.openURL(biz.website)}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={13} color={COLORS.info} />
              <Text style={styles.webBtnText}>Website</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

export default function DeepSearchScreen({ route, navigation }) {
  const prefillService = route.params?.service || "";
  const prefillAddress = route.params?.address || "";

  const [service, setService] = useState(prefillService);
  const [address, setAddress] = useState(prefillAddress);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const startTimer = () => {
    setElapsedSec(0);
    timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSearch = async () => {
    if (!service.trim() || !address.trim()) {
      Alert.alert("Missing Info", "Please enter both a service type and an address.");
      return;
    }
    setResult(null);
    setLoading(true);
    startTimer();
    try {
      const data = await API.findBusiness(service.trim(), address.trim());
      setResult(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (e) {
      Alert.alert("Deep Search Failed", e.message || "Could not complete the search.");
    } finally {
      stopTimer();
      setLoading(false);
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Deep Search</Text>
            <View style={styles.alphaBadge}>
              <Text style={styles.alphaText}>ALPHA</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Chrome-powered Google Maps scraper. Finds real businesses with live ratings. Takes 3-8 min.
          </Text>
        </Animated.View>

        {/* Warning card */}
        <View style={styles.warnCard}>
          <Ionicons name="time-outline" size={16} color={COLORS.warning} />
          <Text style={styles.warnText}>
            This runs a heavyweight Gemini + Chrome pipeline. Expect 3-8 minutes for results.
          </Text>
        </View>

        {/* Service input */}
        <Text style={styles.inputLabel}>Service Type</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="construct-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            value={service}
            onChangeText={setService}
            placeholder="e.g. plumber, electrician, AC technician"
            placeholderTextColor={COLORS.textMuted}
            editable={!loading}
          />
        </View>

        {/* Address input */}
        <Text style={styles.inputLabel}>Address / Area</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. DHA Phase 6, Karachi"
            placeholderTextColor={COLORS.textMuted}
            editable={!loading}
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSearch}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.searchBtnWrap}
        >
          <LinearGradient
            colors={loading ? [COLORS.surface, COLORS.card] : ["#0EA5E9", "#38BDF8"]}
            style={styles.searchBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={COLORS.info} size="small" />
                <Text style={[styles.searchBtnText, { color: COLORS.info }]}>
                  Searching... {formatTime(elapsedSec)}
                </Text>
              </View>
            ) : (
              <View style={styles.loadingRow}>
                <Ionicons name="globe-outline" size={18} color="#fff" />
                <Text style={styles.searchBtnText}>Start Deep Search</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Loading animation */}
        {loading && (
          <View style={styles.loadingCard}>
            <LinearGradient colors={["rgba(14,165,233,0.12)", "rgba(56,189,248,0.06)"]} style={StyleSheet.absoluteFill} />
            <Text style={styles.loadingTitle}>Chrome pipeline running...</Text>
            <View style={styles.loadingSteps}>
              {[
                { icon: "globe-outline", label: "Launching Chrome", done: elapsedSec > 5 },
                { icon: "search-outline", label: "Scraping Google Maps", done: elapsedSec > 30 },
                { icon: "location-outline", label: "Geocoding results", done: elapsedSec > 90 },
                { icon: "sparkles", label: "Gemini ranking & scoring", done: elapsedSec > 180 },
              ].map((step, i) => (
                <View key={i} style={styles.loadingStep}>
                  <Ionicons
                    name={step.done ? "checkmark-circle" : step.icon}
                    size={16}
                    color={step.done ? COLORS.success : COLORS.textMuted}
                  />
                  <Text style={[styles.loadingStepText, step.done && { color: COLORS.success }]}>
                    {step.label}
                  </Text>
                  {!step.done && <ActivityIndicator size={10} color={COLORS.textMuted} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            <View style={styles.resultHeader}>
              <View style={styles.resultBadge}>
                <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                <Text style={styles.resultBadgeText}>COMPLETE</Text>
              </View>
              <Text style={styles.resultTitle}>
                {result.businesses?.length || 0} businesses found
              </Text>
              <Text style={styles.resultMeta}>
                Service: {result.service} · {result.address}
              </Text>
            </View>

            {result.report ? (
              <View style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.geminiDot} />
                  <Text style={styles.reportTitle}>Gemini Analysis Report</Text>
                </View>
                <Text style={styles.reportText}>{result.report}</Text>
              </View>
            ) : null}

            {(result.businesses || []).map((biz, i) => (
              <BusinessCard key={i} biz={biz} index={i} delay={i * 100} />
            ))}

            {result.report_file ? (
              <View style={styles.reportFilePill}>
                <Ionicons name="document-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.reportFileText}>Report saved: {result.report_file}</Text>
              </View>
            ) : null}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 48 },

  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  title: { fontSize: 26, ...FONTS.extraBold, color: COLORS.text },
  alphaBadge: {
    backgroundColor: COLORS.info + "22", borderRadius: RADIUS.full,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.info + "55",
  },
  alphaText: { fontSize: 10, color: COLORS.info, ...FONTS.bold, letterSpacing: 0.8 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 18 },

  warnCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: COLORS.warning + "12", borderRadius: RADIUS.md,
    padding: 12, marginBottom: 20, borderWidth: 1, borderColor: COLORS.warning + "44",
  },
  warnText: { flex: 1, fontSize: 12, color: COLORS.warning, lineHeight: 18 },

  inputLabel: { fontSize: 11, ...FONTS.bold, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  input: { flex: 1, color: COLORS.text, fontSize: 14 },

  searchBtnWrap: { borderRadius: RADIUS.lg, overflow: "hidden", marginBottom: 18, ...SHADOWS.glow },
  searchBtn: { paddingVertical: 16, alignItems: "center", borderRadius: RADIUS.lg },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBtnText: { color: "#fff", fontSize: 15, ...FONTS.semiBold },

  loadingCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.info + "33",
    overflow: "hidden",
  },
  loadingTitle: { fontSize: 13, ...FONTS.semiBold, color: COLORS.info, marginBottom: 14 },
  loadingSteps: { gap: 12 },
  loadingStep: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingStepText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },

  resultHeader: { marginBottom: 16 },
  resultBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: COLORS.successGlow, borderRadius: RADIUS.full,
    paddingHorizontal: 9, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.success + "44",
  },
  resultBadgeText: { fontSize: 10, color: COLORS.success, ...FONTS.bold, letterSpacing: 0.8 },
  resultTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  resultMeta: { fontSize: 12, color: COLORS.textSecondary },

  reportCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.primary + "44",
  },
  reportHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  geminiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  reportTitle: { fontSize: 11, ...FONTS.bold, color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.6 },
  reportText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  // Business card
  bizCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
    overflow: "hidden", position: "relative",
    ...SHADOWS.md,
  },
  bizCardGold: { borderColor: COLORS.warning + "55", ...SHADOWS.glowProvider },
  cardShimmer: { position: "absolute", top: 0, left: 0, right: 0, height: 100 },
  bizHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  rankBadge: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rankText: { color: "#000", fontSize: 12, ...FONTS.extraBold },
  bizName: { fontSize: 15, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  sourceChip: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: COLORS.info + "18", borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.info + "33",
  },
  sourceChipText: { fontSize: 9, color: COLORS.info, ...FONTS.semiBold },
  ratingWrap: { alignItems: "flex-end", gap: 2, paddingTop: 2 },
  ratingText: { fontSize: 15, ...FONTS.bold, color: COLORS.warning },
  reviewsText: { fontSize: 9, color: COLORS.textMuted },

  bizDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  bizInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 7 },
  bizInfoText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  scoreLabel: { fontSize: 11, color: COLORS.textSecondary },
  scoreRight: { flexDirection: "row", alignItems: "baseline", gap: 1 },
  scoreNum: { fontSize: 18, ...FONTS.extraBold, color: COLORS.primary },
  scoreMax: { fontSize: 12, color: COLORS.textMuted },

  reasonBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 12, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  reasonHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  reasonLabel: { fontSize: 10, ...FONTS.bold, color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  geminiChip: {
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.primary + "44",
  },
  geminiChipText: { fontSize: 9, color: COLORS.primary, ...FONTS.semiBold },
  reasonText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: "italic", lineHeight: 18 },

  bizActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.success, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10 },
  callBtnText: { color: "#fff", fontSize: 13, ...FONTS.semiBold },
  webBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.info + "55" },
  webBtnText: { fontSize: 13, color: COLORS.info, ...FONTS.semiBold },
  noPhone: { flexDirection: "row", alignItems: "center", gap: 6, opacity: 0.45 },
  noPhoneText: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },

  reportFilePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 10, marginTop: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  reportFileText: { flex: 1, fontSize: 11, color: COLORS.textMuted },
});
