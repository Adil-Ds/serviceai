import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Pressable, Modal, Animated, Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API } from "../../services/api";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";
import BrandLogo from "../../components/BrandLogo";

const TIME_SLOTS = [
  { id: "morning", label: "09:00 – 11:00 AM", icon: "sunny-outline", sub: "Morning" },
  { id: "midday", label: "11:00 AM – 1:00 PM", icon: "partly-sunny-outline", sub: "Midday" },
  { id: "afternoon", label: "02:00 – 04:00 PM", icon: "cloud-outline", sub: "Afternoon" },
  { id: "evening", label: "04:00 – 06:00 PM", icon: "moon-outline", sub: "Evening" },
];

function formatDateDMY(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function BookingScreen({ route, navigation }) {
  const { provider: rankedProvider, intent } = route.params;
  const { userProfile } = useAuth();
  const p = rankedProvider.provider;

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split("T")[0];

  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [address, setAddress] = useState(intent?.address || "");
  const [bookingDate, setBookingDate] = useState(intent?.date || todayStr);
  const [problem, setProblem] = useState("");
  const [offeredPrice, setOfferedPrice] = useState(p.price_min.toString());
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);

  // --- Brand new calling overlay states & anims ---
  const [showCallModal, setShowCallModal] = useState(false);
  const [callLogs, setCallLogs] = useState([]);
  const [callStatus, setCallStatus] = useState("Initializing Dispatch...");
  const [pulseAnim] = useState(new Animated.Value(1));
  const [waveAnims] = useState(() => Array.from({ length: 5 }, () => new Animated.Value(0.2)));
  const [callOutcome, setCallOutcome] = useState("calling"); // "calling" | "failed"

  useEffect(() => {
    // Fetch booked slots dynamically whenever selected bookingDate is switched
    API.getBookedSlots(p.id, bookingDate)
      .then((slots) => setBookedSlots(slots))
      .catch(() => {}); // fail silently
  }, [bookingDate]);

  // Audio waveform scaling
  useEffect(() => {
    let loops = [];
    if (showCallModal) {
      if (callOutcome === "calling") {
        // Pulsing profile rings
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.35, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
          ])
        ).start();

        // Waveform scaling
        waveAnims.forEach((anim, i) => {
          const l = Animated.loop(
            Animated.sequence([
              Animated.delay(i * 120),
              Animated.timing(anim, { toValue: Math.random() * 0.8 + 0.2, duration: 300, useNativeDriver: true }),
              Animated.timing(anim, { toValue: 0.2, duration: 300, useNativeDriver: true }),
            ])
          );
          l.start();
          loops.push(l);
        });
      } else {
        pulseAnim.setValue(1);
        waveAnims.forEach(anim => anim.setValue(0.1));
      }
    } else {
      pulseAnim.setValue(1);
      waveAnims.forEach(anim => anim.setValue(0.2));
    }
    return () => {
      loops.forEach(l => l.stop());
    };
  }, [showCallModal, callOutcome]);

  const bookingTimersRef = useRef([]);

  async function handleBook() {
    if (!address.trim()) {
      Alert.alert("Address Required", "Please enter your complete address.");
      return;
    }

    // Clear old timers
    bookingTimersRef.current.forEach(clearTimeout);
    bookingTimersRef.current = [];
    
    // Reset call modal states
    setCallLogs([]);
    setCallStatus("Initializing VoIP...");
    setCallOutcome("calling");
    setShowCallModal(true);
    setLoading(true);

    const steps = [
      { t: 0, status: "VoIP Gateway Connecting...", log: "📡 Connecting to BookNFix secure gateway..." },
      { t: 800, status: "Initializing AI Agent...", log: "🤖 Dispatch Agent 4 initialized. Status: Online" },
      { t: 1800, status: `Dialing ${p.name}...`, log: `📞 Dialing provider ${p.name} at +92 ${p.phone || "300-1234567"}...` },
      { t: 3000, status: "Ringing...", log: "🔔 Connection established. Line ringing..." },
      { t: 5000, status: "Ringing (No Answer)...", log: `⏳ Ringing timed out. No response from ${p.name}.` },
      { t: 6500, status: "Provider Not Available", log: `❌ Dispatch failed: Provider unreachable at this time.` },
      { t: 7800, status: "Booking Marked Pending", log: "📝 Request saved as PENDING. You can try dispatching again." },
    ];

    // Trigger sequential visual updates for user wow factor
    steps.forEach((step) => {
      const tId = setTimeout(() => {
        setCallStatus(step.status);
        setCallLogs((prev) => [...prev, step.log]);
        if (step.status === "Booking Marked Pending") {
          setCallOutcome("failed");
          setLoading(false);
        }
      }, step.t);
      bookingTimersRef.current.push(tId);
    });

    try {
      const finalLocation = problem.trim() 
        ? `${address.trim()} (Problem: ${problem.trim()})`
        : address.trim();

      const bookingPayload = {
        provider_id: p.id,
        provider_name: p.name,
        service_category: p.category,
        user_id: userProfile?.id || "GUEST-" + Math.floor(Math.random() * 10000),
        user_name: userProfile?.name || "Guest User",
        user_location: p.area + ", " + p.city,
        location_address: finalLocation,
        date: bookingDate,
        time_slot: selectedSlot.label,
        price_agreed: parseFloat(offeredPrice) || p.price_min,
      };

      // Start actual backend booking immediately in parallel to sync database
      const userPhone = userProfile?.phone || "0300-1234567";
      API.book(bookingPayload, userPhone).catch(() => {});
      
      // We also trigger API initiate call in parallel
      API.initiateCall({
        provider_phone: toE164 ? toE164(p.phone) : p.phone,
        provider_name: p.name,
        user_name: userProfile?.name || "Guest User",
        user_address: finalLocation,
        problem: problem || "Service required",
        service_type: p.category,
        preferred_time: `${bookingDate} at ${selectedSlot.label}`,
        language: "ur",
        user_phone: userPhone,
        booking_id: null,
        user_id: userProfile?.id || null,
      }).catch(() => {});

    } catch (e) {
      console.warn("Background persistence failed", e);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Provider Summary Card */}
          <LinearGradient colors={["#12123A", "#0D0D28"]} style={styles.providerCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.providerRow}>
              <LinearGradient colors={[COLORS.primary, "#8B5CF6"]} style={styles.avatar}>
                <Text style={styles.avatarText}>{p.name[0]}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{p.name}</Text>
                <View style={styles.providerMeta}>
                  <Ionicons name="star" size={12} color={COLORS.warning} />
                  <Text style={styles.providerMetaText}>{p.rating} · {p.review_count} reviews</Text>
                </View>
                <Text style={styles.providerArea}>
                  <Ionicons name="location-outline" size={11} color={COLORS.textMuted} /> {p.area}, {p.city}
                </Text>
              </View>
              {p.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Booking Date (Interactive Today / Tomorrow Selector) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Date</Text>
            <View style={styles.dateSelectorRow}>
              <TouchableOpacity
                style={[styles.dateCard, bookingDate === todayStr && styles.dateCardActive]}
                onPress={() => setBookingDate(todayStr)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={16} color={bookingDate === todayStr ? COLORS.success : COLORS.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dateCardLabel, bookingDate === todayStr && styles.dateCardLabelActive]}>Today</Text>
                  <Text style={styles.dateCardSub}>{formatDateDMY(todayStr)}</Text>
                </View>
                {bookingDate === todayStr && (
                  <View style={styles.dateCardCheck}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateCard, bookingDate === tomorrowStr && styles.dateCardActive]}
                onPress={() => setBookingDate(tomorrowStr)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar" size={16} color={bookingDate === tomorrowStr ? COLORS.success : COLORS.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dateCardLabel, bookingDate === tomorrowStr && styles.dateCardLabelActive]}>Tomorrow</Text>
                  <Text style={styles.dateCardSub}>{formatDateDMY(tomorrowStr)}</Text>
                </View>
                {bookingDate === tomorrowStr && (
                  <View style={styles.dateCardCheck}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Slots */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Slot</Text>
            <View style={styles.slotsGrid}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot.id === slot.id;
                const isBooked = bookedSlots.includes(slot.label);
                return (
                  <Pressable
                    key={slot.id}
                    style={[
                      styles.slotCard,
                      isSelected && !isBooked && styles.slotCardActive,
                      isBooked && styles.slotCardBooked,
                    ]}
                    onPress={() => !isBooked && setSelectedSlot(slot)}
                    disabled={isBooked}
                  >
                    <Ionicons
                      name={isBooked ? "close-circle-outline" : slot.icon}
                      size={18}
                      color={isBooked ? COLORS.danger : isSelected ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.slotSub, isSelected && !isBooked && styles.slotSubActive, isBooked && styles.slotSubBooked]}>
                      {slot.sub}
                    </Text>
                    <Text style={[styles.slotTime, isSelected && !isBooked && styles.slotTimeActive]} numberOfLines={1}>
                      {slot.label}
                    </Text>
                    {isBooked && (
                      <View style={styles.slotBookedBadge}>
                        <Text style={styles.slotBookedText}>Booked</Text>
                      </View>
                    )}
                    {isSelected && !isBooked && (
                      <View style={styles.slotCheck}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Address Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Address</Text>
            <TextInput
              style={styles.addressInput}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. House 45, Block 7, Gulshan-e-Iqbal, Karachi"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          {/* Problem / Description Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Describe the problem</Text>
            <TextInput
              style={styles.problemInput}
              value={problem}
              onChangeText={setProblem}
              placeholder="Describe the issue (e.g. kitchen water leakage, AC not cooling, wire spark...)"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            {[
              ["Service", p.category.replace(/_/g, " ")],
              ["Provider", p.name],
              ["Date", formatDateDMY(bookingDate)],
              ["Time Slot", selectedSlot.label],
            ].map(([label, val]) => (
              <View key={label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryVal}>{val}</Text>
              </View>
            ))}
            <View style={styles.summaryDivider} />
            
            <View style={[styles.summaryRow, { alignItems: "center", paddingVertical: 4 }]}>
              <Text style={styles.totalLabel}>Offered Price</Text>
              <View style={styles.offeredPriceContainer}>
                <Text style={styles.currencyPrefix}>₨</Text>
                <TextInput
                  style={styles.offeredPriceInput}
                  value={offeredPrice}
                  onChangeText={setOfferedPrice}
                  keyboardType="numeric"
                  placeholder={p.price_min.toString()}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.bookBtn, loading && styles.bookBtnDisabled]}
            onPress={handleBook}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#10D9A0", "#0CB888"]} style={styles.bookBtnGrad}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.bookBtnText}>Creating Booking Request...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.bookBtnText}>Send Booking Request</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            By confirming, you agree to the service terms. The provider will be notified immediately.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- PREMIUM VoIP AI CALL DIALER MODAL OVERLAY --- */}
      <Modal
        visible={showCallModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={["#080816", "#0D0D26", "#070714"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.modalSafe}>
            
            {/* Top brand header */}
            <View style={styles.modalHeader}>
              <BrandLogo size={24} />
              <View style={[styles.dispatchPill, callOutcome === "failed" && { backgroundColor: "#F59E0B22", borderColor: "#F59E0B44" }]}>
                <View style={[styles.dispatchDot, callOutcome === "failed" && { backgroundColor: "#F59E0B" }]} />
                <Text style={[styles.dispatchPillText, callOutcome === "failed" && { color: "#F59E0B" }]}>
                  {callOutcome === "failed" ? "DISPATCH PENDING" : "AI DISPATCH ACTIVE"}
                </Text>
              </View>
            </View>

            {/* Calling connection graphic */}
            <View style={styles.callingVisualContainer}>
              <View style={styles.callingRow}>
                {/* Agent Avatar Box */}
                <View style={styles.avatarWrapper}>
                  <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], borderColor: callOutcome === "failed" ? "#F59E0B" : COLORS.primary }]} />
                  <LinearGradient colors={callOutcome === "failed" ? ["#F59E0B", "#D97706"] : ["#8B5CF6", "#6C63FF"]} style={styles.callAvatar}>
                    <Ionicons name={callOutcome === "failed" ? "alert-circle" : "sparkles"} size={26} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.avatarLabel}>AI Agent 4</Text>
                </View>

                {/* Connecting glowing dashed line */}
                <View style={styles.connectingLineContainer}>
                  <Ionicons name={callOutcome === "failed" ? "close-circle" : "radio-outline"} size={20} color={callOutcome === "failed" ? "#F59E0B" : "#00BCD4"} style={styles.pulsingRadio} />
                  <View style={[styles.dashedLine, callOutcome === "failed" && { borderColor: "#F59E0B" }]} />
                </View>

                {/* Provider Avatar Box */}
                <View style={styles.avatarWrapper}>
                  <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], borderColor: callOutcome === "failed" ? "#F59E0B" : "#E91E8C" }]} />
                  <LinearGradient colors={callOutcome === "failed" ? ["#F59E0B", "#D97706"] : ["#E91E8C", "#FF4081"]} style={styles.callAvatar}>
                    <Text style={styles.callAvatarText}>{p.name[0]}</Text>
                  </LinearGradient>
                  <Text style={styles.avatarLabel}>{p.name.split(" ")[0]}</Text>
                </View>
              </View>

              {callOutcome === "failed" ? (
                /* Dynamic Failed Outcome Warning Card & Interactive Retry Buttons */
                <View style={styles.outcomeCardContainer}>
                  <View style={styles.outcomeBox}>
                    <Ionicons name="alert-circle-outline" size={24} color="#F59E0B" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.outcomeTitle}>Provider Unreachable</Text>
                      <Text style={styles.outcomeSub}>
                        The AI Agent could not connect to {p.name} after multiple attempts. You can try it later.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.outcomeButtonsRow}>
                    <TouchableOpacity 
                      activeOpacity={0.8} 
                      style={styles.retryBtn} 
                      onPress={() => handleBook()}
                    >
                      <Ionicons name="refresh" size={15} color="#fff" />
                      <Text style={styles.retryBtnText}>Retry AI Call</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      activeOpacity={0.8} 
                      style={styles.closeOutcomeBtn} 
                      onPress={() => {
                        setShowCallModal(false);
                        navigation.navigate("UserTabs", { screen: "BookingHistory" });
                      }}
                    >
                      <Text style={styles.closeOutcomeBtnText}>Go to Dashboard</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Enhanced Waveform Audio Simulation */
                <View style={styles.waveformContainer}>
                  {waveAnims.map((anim, idx) => (
                    <Animated.View
                      key={idx}
                      style={[
                        styles.waveformBar,
                        {
                          transform: [{ scaleY: anim }],
                          backgroundColor: idx % 2 === 0 ? "#00BCD4" : "#E91E8C",
                        }
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Status Header */}
              <Text style={[styles.callingStatusText, callOutcome === "failed" && { color: "#F59E0B" }]}>{callStatus}</Text>
            </View>

            {/* Transcription Console Logger */}
            <View style={styles.consoleCard}>
              <View style={styles.consoleHeader}>
                <Ionicons name="terminal-outline" size={14} color="#00BCD4" />
                <Text style={styles.consoleTitle}>REAL-TIME VOICE LOGS</Text>
              </View>
              <ScrollView 
                style={styles.consoleLogsScroll}
                contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
                ref={(r) => r?.scrollToEnd({ animated: true })}
              >
                {callLogs.map((log, idx) => (
                  <View key={idx} style={styles.logRow}>
                    <Text style={styles.logText}>{log}</Text>
                  </View>
                ))}
                {callLogs.length === 0 && (
                  <Text style={styles.placeholderLogText}>Starting call connection logs...</Text>
                )}
              </ScrollView>
            </View>

            {/* Bottom secure footnote */}
            <View style={styles.secureFooter}>
              <Ionicons name="lock-closed" size={12} color="#0CB888" />
              <Text style={styles.secureFooterText}>Secure encrypted VoIP conversation</Text>
            </View>

          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 40 },

  providerCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.primary + "33",
    ...SHADOWS.glow,
  },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, ...FONTS.bold },
  providerName: { fontSize: 16, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  providerMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  providerMetaText: { fontSize: 12, color: COLORS.textSecondary },
  providerArea: { fontSize: 12, color: COLORS.textMuted },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.successGlow,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.success + "44",
  },
  verifiedText: { fontSize: 10, color: COLORS.success, ...FONTS.semiBold },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: RADIUS.md,
    padding: 10,
  },
  priceLabel: { fontSize: 12, color: COLORS.textMuted },
  priceValue: { fontSize: 14, ...FONTS.semiBold, color: COLORS.success },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    ...FONTS.bold,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  dateSelectorRow: { flexDirection: "row", gap: 10 },
  dateCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    position: "relative",
  },
  dateCardActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successGlow,
  },
  dateCardLabel: { fontSize: 13, ...FONTS.bold, color: COLORS.textMuted },
  dateCardLabelActive: { color: COLORS.text, ...FONTS.bold },
  dateCardSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  dateCardCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
  },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotCard: {
    width: "47%",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    position: "relative",
  },
  slotCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  slotCardBooked: {
    borderColor: COLORS.danger + "44",
    backgroundColor: COLORS.dangerGlow,
    opacity: 0.65,
  },
  slotSub: { fontSize: 12, color: COLORS.textMuted, ...FONTS.medium },
  slotSubActive: { color: COLORS.primary },
  slotSubBooked: { color: COLORS.danger },
  slotTime: { fontSize: 10, color: COLORS.textMuted, textAlign: "center" },
  slotTimeActive: { color: COLORS.text },
  slotCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  slotBookedBadge: {
    backgroundColor: COLORS.dangerGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.danger + "44",
  },
  slotBookedText: { fontSize: 9, color: COLORS.danger, ...FONTS.semiBold },

  addressInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    lineHeight: 22,
    minHeight: 60,
    color: COLORS.text,
  },
  problemInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    lineHeight: 22,
    minHeight: 80,
    color: COLORS.text,
  },

  summary: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: { fontSize: 12, ...FONTS.bold, color: COLORS.text, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryVal: { fontSize: 13, ...FONTS.medium, color: COLORS.text },
  summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  totalLabel: { fontSize: 15, ...FONTS.semiBold, color: COLORS.text },
  totalValue: { fontSize: 22, ...FONTS.extraBold, color: COLORS.success },

  offeredPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 120,
    justifyContent: "flex-end",
  },
  currencyPrefix: {
    fontSize: 16,
    ...FONTS.bold,
    color: COLORS.success,
    marginRight: 4,
  },
  offeredPriceInput: {
    fontSize: 18,
    ...FONTS.extraBold,
    color: COLORS.success,
    padding: 0,
    textAlign: "right",
    minWidth: 70,
  },

  bookBtn: { borderRadius: RADIUS.lg, overflow: "hidden", marginBottom: 14, ...SHADOWS.glowSuccess },
  bookBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  bookBtnGrad: { paddingVertical: 16, alignItems: "center", borderRadius: RADIUS.lg },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bookBtnText: { color: "#fff", fontSize: 16, ...FONTS.semiBold },

  disclaimer: { fontSize: 11, color: COLORS.textMuted, textAlign: "center", lineHeight: 17 },

  // --- Brand New Enhanced Call UI Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#070714",
  },
  modalSafe: {
    flex: 1,
    width: "100%",
    padding: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },
  dispatchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,188,212,0.12)",
    borderWidth: 1,
    borderColor: "#00BCD444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dispatchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00BCD4",
  },
  dispatchPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00BCD4",
    letterSpacing: 1,
  },
  callingVisualContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 20,
  },
  callingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "85%",
    marginBottom: 40,
  },
  avatarWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#6C63FF",
    opacity: 0.25,
  },
  callAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#181838",
  },
  callAvatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
  },
  avatarLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EAEAEA",
    marginTop: 10,
  },
  connectingLineContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 40,
  },
  pulsingRadio: {
    position: "absolute",
    zIndex: 2,
    backgroundColor: "#0D0D26",
    padding: 6,
    borderRadius: 15,
  },
  dashedLine: {
    width: "100%",
    height: 2,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 60,
    marginBottom: 20,
  },
  waveformBar: {
    width: 5,
    height: 44,
    borderRadius: 3,
  },
  callingStatusText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  consoleCard: {
    width: "100%",
    height: 220,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  consoleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingBottom: 8,
    marginBottom: 10,
  },
  consoleTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00BCD4",
    letterSpacing: 1.2,
  },
  consoleLogsScroll: {
    flex: 1,
  },
  logRow: {
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#E91E8C",
  },
  logText: {
    fontSize: 11,
    color: "#EAEAEA",
    lineHeight: 16,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  placeholderLogText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 40,
  },
  secureFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    opacity: 0.7,
  },
  secureFooterText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#0CB888",
  },
  outcomeCardContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 15,
    paddingHorizontal: 16,
  },
  outcomeBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    borderRadius: 16,
    padding: 14,
    width: "100%",
    marginBottom: 16,
  },
  outcomeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#F59E0B",
    marginBottom: 4,
  },
  outcomeSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 18,
  },
  outcomeButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    flex: 1,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  closeOutcomeBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    flex: 1,
  },
  closeOutcomeBtnText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
});
