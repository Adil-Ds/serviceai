import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Modal, ScrollView,
  TouchableOpacity, RefreshControl, Alert, TextInput,
  ActivityIndicator, Animated, Platform, KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";
import { StatusBadge } from "../../components/ui/Badge";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { OUTCOME_CFG } from "../../components/BookingModal";

// ── Transcript / Details Modal ────────────────────────────────────────────────
function TranscriptModal({ visible, booking, callData, loading, onClose }) {
  const circleScale  = useRef(new Animated.Value(0)).current;
  const pulseRing1   = useRef(new Animated.Value(0)).current;
  const pulseRing2   = useRef(new Animated.Value(0)).current;
  const slideAnims   = useRef([0, 1, 2].map(() => new Animated.Value(250))).current;

  const isSuccess   = booking?.status === "CONFIRMED" || callData?.outcome === "ACCEPTED";

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
    if (!visible) return;

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

  }, [visible]);

  const outcomeCfg = callData
    ? (OUTCOME_CFG[callData.outcome] || OUTCOME_CFG[callData.status] || OUTCOME_CFG.FAILED)
    : null;

  const circleColor = isSuccess ? COLORS.success : (outcomeCfg?.color || COLORS.primary);
  const circleIcon  = isSuccess ? "checkmark"    : (outcomeCfg?.icon  || "receipt-outline");
  const titleText   = isSuccess ? "Booking Confirmed" : (outcomeCfg?.title || "Booking Details");
  const subText     = isSuccess
    ? "Provider confirmed your appointment"
    : (outcomeCfg?.sub || booking?.status || "—");

  const followUps = [
    {
      icon: "notifications-outline",
      when: "10 MIN BEFORE ARRIVAL",
      msg: `Your service provider is on the way. ${booking?.provider_name ? booking.provider_name.split(" ")[0] : "Provider"} is 8 mins away.`,
    },
    { icon: "star-outline",      when: "AFTER SERVICE",  msg: `How did it go? Tap to rate ${booking?.provider_name || "Provider"}.` },
    { icon: "chatbubble-outline", when: "3 DAYS LATER",  msg: "Hope everything went well! Need a follow-up visit?" },
  ];

  const receiptRows = [
    { label: "Service",  value: booking?.service || booking?.service_category || "—" },
    { label: "Provider", value: booking?.provider_name || "—" },
    { 
      label: "When",     
      value: booking?.time_slot?.startsWith("pending_") && booking?.suggested_time
        ? booking.suggested_time
        : (booking?.date ? `${booking.date}${booking.time_slot ? ` · ${booking.time_slot}` : ""}` : "Pending")
    },
    ...(booking?.location_address && !booking.location_address.startsWith("pending_")
      ? [{ label: "Address", value: booking.location_address }] : []),
  ];

  const statusColor = booking?.status === "CONFIRMED" ? COLORS.success
    : booking?.status === "CANCELLED" ? "#EF4444"
    : COLORS.warning;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tm.overlay}>
        <View style={tm.sheet}>
          <LinearGradient
            colors={[circleColor + "22", "transparent"]}
            style={tm.glowBg}
            pointerEvents="none"
          />

          <View style={tm.handle} />

          {/* Confetti Particle Overlay */}
          {visible && particles.map(p => {
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

          {loading ? (
            <View style={tm.centered}>
              <ActivityIndicator size="large" color={COLORS.success} style={{ marginBottom: 12 }} />
              <Text style={tm.loadingText}>Loading call details…</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tm.scrollContent}>
              
              {/* Expanding Pulse Rings */}
              <View style={tm.circleWrapper}>
                <Animated.View
                  style={[
                    tm.pulseRing,
                    {
                      borderColor: circleColor,
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
                      borderColor: circleColor,
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
                      backgroundColor: circleColor,
                      shadowColor: circleColor,
                      transform: [{ scale: circleScale }],
                    },
                  ]}
                >
                  <Ionicons name={circleIcon} size={44} color="#fff" />
                </Animated.View>
              </View>

              <Text style={tm.outcomeTitle}>{titleText}</Text>
              <Text style={tm.outcomeSub}>{subText}</Text>

              {/* Digital Perforated Ticket Card */}
              <View style={tm.receiptCard}>
                <View style={tm.receiptHeader}>
                  <View>
                    <Text style={tm.receiptIdLabel}>BOOKING ID</Text>
                    <Text style={tm.receiptIdValue}>
                      {(() => {
                        const rawId = booking?.booking_id || booking?.id || "";
                        if (!rawId) return "—";
                        if (rawId.toUpperCase().startsWith("BK-")) return rawId.toUpperCase();
                        return `BK-${rawId.toUpperCase()}`;
                      })()}
                    </Text>
                  </View>
                  <View style={[tm.statusPill, { backgroundColor: statusColor + "15", borderColor: statusColor + "44" }]}>
                    <Ionicons name={booking?.status === "CONFIRMED" ? "checkmark-circle" : "time-outline"} size={11} color={statusColor} style={{ marginRight: 3 }} />
                    <Text style={[tm.statusPillText, { color: statusColor }]}>{booking?.status || "PENDING"}</Text>
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

              {/* Suggested time details */}
              {callData?.suggested_time ? (
                <View style={tm.suggestedBox}>
                  <Ionicons name="time" size={16} color={COLORS.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={tm.suggestedLabel}>PROVIDER SUGGESTED NEW SLOT</Text>
                    <Text style={tm.suggestedValue}>{callData.suggested_time}</Text>
                  </View>
                </View>
              ) : null}

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
          )}

          {/* Custom Home Done Button */}
          <View style={tm.footer}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={tm.doneBtn}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.violet]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={tm.doneBtnGrad}
              >
                <Ionicons name="close-circle-outline" size={18} color="#fff" />
                <Text style={tm.doneBtnText}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── AI Negotiation Panel ───────────────────────────────────────────────────────
function AgentNegotiationPanel({ booking, onResolved }) {
  const [phase,         setPhase]         = useState("idle"); // idle | calling | done
  const [showCounter,   setShowCounter]   = useState(false);
  const [counterTime,   setCounterTime]   = useState("");

  const doConfirm = async (decision, proposedTime = null) => {
    setPhase("calling");
    try {
      const res = await API.confirmCall(booking.call_log_id, decision, proposedTime);
      setPhase("done");

      if (res.outcome === "ACCEPTED") {
        Alert.alert("Booking Confirmed!", "The provider confirmed your appointment.");
        onResolved("CONFIRMED");
      } else if (res.outcome === "SUGGESTED_TIME") {
        Alert.alert(
          "Provider Suggested Again",
          `They now propose: ${res.suggested_time || "a different time"}.\n\nThe booking remains pending — refresh to act again.`,
          [{ text: "OK" }]
        );
        onResolved("PENDING_REFRESH");
      } else if (res.outcome === "REJECTED" || res.outcome === "USER_REJECTED") {
        Alert.alert("Booking Cancelled", "The booking has been cancelled.");
        onResolved("CANCELLED");
      }
    } catch (e) {
      setPhase("idle");
      Alert.alert("Error", "Could not process your response. Try again.\n" + e.message);
    }
  };

  if (phase === "calling") {
    return (
      <View style={s.negotiationBox}>
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
        <Text style={s.negCallingText}>AI Agent is calling the provider…</Text>
      </View>
    );
  }

  if (phase === "done") return null;

  return (
    <View style={s.negotiationBox}>
      <LinearGradient
        colors={["rgba(255,165,0,0.08)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.negHeader}>
        <View style={s.negDot} />
        <Text style={s.negTitle}>Provider Suggested a Time</Text>
      </View>

      <View style={s.suggestedRow}>
        <Ionicons name="time-outline" size={15} color={COLORS.warning} />
        <Text style={s.suggestedTime}>{booking.suggested_time || "Alternative time"}</Text>
      </View>

      <Text style={s.negHint}>Respond to the provider's suggested slot:</Text>

      {/* Action buttons */}
      <View style={s.actionRow}>
        {/* Accept */}
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnAccept]}
          onPress={() => doConfirm("ACCEPT")}
          activeOpacity={0.87}
        >
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={[s.actionBtnText, { color: COLORS.success }]}>Accept</Text>
        </TouchableOpacity>

        {/* Propose Time */}
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnCounter, showCounter && s.actionBtnCounterActive]}
          onPress={() => { setShowCounter((v) => !v); setCounterTime(""); }}
          activeOpacity={0.87}
        >
          <Ionicons name="repeat-outline" size={16} color={COLORS.primary} />
          <Text style={[s.actionBtnText, { color: COLORS.primary }]}>Offer Time</Text>
        </TouchableOpacity>

        {/* Decline */}
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnReject]}
          onPress={() =>
            Alert.alert(
              "Decline & Cancel",
              "This will cancel the booking. Are you sure?",
              [
                { text: "Keep", style: "cancel" },
                { text: "Decline", style: "destructive", onPress: () => doConfirm("REJECT") },
              ]
            )
          }
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
          <Text style={[s.actionBtnText, { color: COLORS.danger }]}>Decline</Text>
        </TouchableOpacity>
      </View>

      {/* Propose different time input */}
      {showCounter && (
        <View style={s.counterSection}>
          <Text style={s.counterLabel}>Propose your preferred time:</Text>
          <TextInput
            style={s.counterInput}
            value={counterTime}
            onChangeText={setCounterTime}
            placeholder="e.g. Wednesday 3pm, Sunday 11am"
            placeholderTextColor={COLORS.textDim}
            autoFocus
          />
          <TouchableOpacity
            style={[s.counterSendBtn, !counterTime.trim() && s.counterSendBtnDisabled]}
            onPress={() => {
              if (counterTime.trim()) doConfirm("COUNTER", counterTime.trim());
            }}
            activeOpacity={counterTime.trim() ? 0.87 : 1}
          >
            <LinearGradient
              colors={counterTime.trim() ? [COLORS.primary, COLORS.violet] : [COLORS.border, COLORS.border]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.counterSendGrad}
            >
              <Ionicons name="send-outline" size={14} color={counterTime.trim() ? "#fff" : COLORS.textMuted} />
              <Text style={[s.counterSendText, !counterTime.trim() && { color: COLORS.textMuted }]}>
                Send Propose
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Booking Card ───────────────────────────────────────────────────────────────
function BookingCard({ booking, onCancel, onRefresh }) {
  const isAIPending = booking.status === "PENDING" && !!booking.call_log_id;
  const canCancel   = booking.status === "PENDING" && !booking.call_log_id;

  const [tmVisible,  setTmVisible]  = useState(false);
  const [tmCallData, setTmCallData] = useState(null);
  const [tmLoading,  setTmLoading]  = useState(false);

  const openTranscript = async () => {
    setTmVisible(true);
    if (booking.call_log_id) {
      setTmLoading(true);
      setTmCallData(null);
      try {
        const data = await API.getCallStatus(booking.call_log_id);
        setTmCallData(data);
      } catch (_) {}
      setTmLoading(false);
    }
  };

  const handleResolved = () => {
    onRefresh();
  };

  // date helper for left calendar badge
  const getBadgeDate = (dateStr) => {
    if (!dateStr) return { top: "PEND", bottom: "—" };
    const lower = dateStr.toLowerCase();
    if (lower.includes("today")) return { top: "TODAY", bottom: "★" };
    if (lower.includes("tomorrow")) return { top: "TMRW", bottom: "☆" };
    
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        const parts = dateStr.split(" ");
        if (parts.length >= 2) {
          return { top: parts[0].slice(0, 3).toUpperCase(), bottom: parts[1].replace(/\D/g, "") || "—" };
        }
        return { top: "DATE", bottom: dateStr.slice(0, 3) };
      }
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return { top: months[d.getMonth()], bottom: String(d.getDate()) };
    } catch {
      return { top: "DATE", bottom: "—" };
    }
  };

  const badgeDate = getBadgeDate(booking.date);

  return (
    <View style={[styles.card, isAIPending && styles.cardAIPending]}>
      <View style={styles.cardLayoutRow}>
        {/* Left Square Calendar Date Badge */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeTop}>{badgeDate.top}</Text>
          <Text style={styles.dateBadgeBottom}>{badgeDate.bottom}</Text>
        </View>

        {/* Right Details Panel */}
        <View style={styles.detailsPanel}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.service} numberOfLines={1}>{booking.service}</Text>
            <StatusBadge status={booking.status} />
          </View>
          
          <Text style={styles.provider}>{booking.provider_name}</Text>
          
          {isAIPending && (
            <View style={styles.aiAgentChip}>
              <Ionicons name="sparkles" size={10} color={COLORS.primary} />
              <Text style={styles.aiAgentChipText}>AI Agent Negotiation</Text>
            </View>
          )}

          <View style={styles.metaRow}>
            {/* Display time slot, substituting raw DB pending keys with beautiful suggested times */}
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={COLORS.primaryLight} />
              <Text style={[styles.metaText, isAIPending && { color: COLORS.primaryLight, fontWeight: "700" }]}>
                {booking.time_slot?.startsWith("pending_") && booking.suggested_time
                  ? booking.suggested_time
                  : (booking.time_slot ? booking.time_slot.split("–")[0]?.trim() : "Anytime")}
              </Text>
            </View>

            {/* Display price or negotiable status badge */}
            {(!isAIPending && booking.price_agreed > 0) ? (
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={12} color={COLORS.success} />
                <Text style={[styles.metaText, { color: COLORS.success, fontWeight: "700" }]}>
                  ₨{booking.price_agreed.toLocaleString()}
                </Text>
              </View>
            ) : (
              <View style={[styles.metaItem, { backgroundColor: "rgba(108, 99, 255, 0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "rgba(108, 99, 255, 0.25)" }]}>
                <Ionicons name="sparkles-outline" size={11} color={COLORS.primaryLight} style={{ marginRight: 2 }} />
                <Text style={[styles.metaText, { color: COLORS.primaryLight, fontWeight: "800", fontSize: 10 }]}>
                  Price Negotiable
                </Text>
              </View>
            )}
          </View>

          {booking.location_address && !booking.location_address.startsWith("pending_") ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
              <Text style={styles.addressText} numberOfLines={1}>{booking.location_address}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* AI negotiation panel — only for PENDING AI bookings */}
      {isAIPending && (
        <AgentNegotiationPanel booking={booking} onResolved={handleResolved} />
      )}

      {canCancel && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => onCancel(booking.id)}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={14} color={COLORS.danger} />
          <Text style={styles.cancelBtnText}>Cancel Booking</Text>
        </TouchableOpacity>
      )}

      {/* Show Ticket Details button */}
      <TouchableOpacity style={styles.transcriptBtn} onPress={openTranscript} activeOpacity={0.8}>
        <LinearGradient
          colors={[COLORS.primary + "18", COLORS.violet + "10"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.transcriptBtnGrad}
        >
          <Ionicons name="receipt-outline" size={14} color={COLORS.primary} />
          <Text style={styles.transcriptBtnText}>Show Ticket Details</Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.primary} style={{ marginLeft: "auto" }} />
        </LinearGradient>
      </TouchableOpacity>

      <TranscriptModal
        visible={tmVisible}
        booking={booking}
        callData={tmCallData}
        loading={tmLoading}
        onClose={() => setTmVisible(false)}
      />
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "ALL",       label: "All" },
  { key: "PENDING",   label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "CANCELLED", label: "Cancelled" },
];
const FILTER_COLORS = {
  ALL:       COLORS.primary,
  PENDING:   COLORS.warning,
  CONFIRMED: COLORS.success,
  CANCELLED: COLORS.danger,
};

export default function BookingHistoryScreen() {
  const { userProfile } = useAuth();
  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState("ALL");
  const [cancelling, setCancelling] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await API.getAllBookings(userProfile?.uid);
      setBookings(data);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = (bookingId) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelling(bookingId);
            try {
              await API.updateBookingStatus(bookingId, "CANCELLED");
              setBookings((prev) =>
                prev.map((b) => b.id === bookingId ? { ...b, status: "CANCELLED" } : b)
              );
            } catch (e) {
              Alert.alert("Error", "Could not cancel booking. Please try again.\n" + e.message);
            } finally {
              setCancelling(null);
            }
          },
        },
      ]
    );
  };

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
  const pending   = bookings.filter((b) => b.status === "PENDING").length;

  const displayed = filter === "ALL"
    ? bookings
    : bookings.filter((b) => b.status === filter);

  // Get count for individual filters
  const getFilterCount = (key) => {
    if (key === "ALL") return bookings.length;
    return bookings.filter(b => b.status === key).length;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Ambient Radial Gradient background */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <LinearGradient
          colors={["rgba(108,99,255,0.06)", "rgba(16,217,160,0.02)", "transparent"]}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>{bookings.length} total · {confirmed} confirmed · {pending} pending</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRowContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const color  = FILTER_COLORS[f.key];
            const count  = getFilterCount(f.key);
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, active && { backgroundColor: color + "20", borderColor: color + "66" }]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, active && { color }]}>{f.label}</Text>
                <View style={[styles.filterPillBadge, active && styles.filterPillBadgeActive]}>
                  <Text style={[styles.filterPillBadgeText, active && { color }]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onCancel={handleCancel}
              cancelling={cancelling === item.id}
              onRefresh={fetchData}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>
                {filter === "ALL" ? "No bookings yet" : `No ${filter.toLowerCase()} bookings`}
              </Text>
              <Text style={styles.emptySub}>
                {filter === "ALL" ? "Book a service from the Home tab" : "Try a different filter"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingBottom: 12 },
  title:    { fontSize: 26, fontWeight: "900", color: COLORS.text, marginBottom: 4, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },

  filterRowContainer: {
    height: 48,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  filterTabText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "700" },
  filterPillBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 7,
  },
  filterPillBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  filterPillBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textMuted,
  },

  list: { padding: 16, paddingTop: 8, paddingBottom: 48 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardAIPending: {
    borderColor: COLORS.warning + "55",
    shadowColor: COLORS.warning,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardLayoutRow: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
  },
  dateBadge: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  dateBadgeTop: {
    fontSize: 8, color: COLORS.textMuted, fontWeight: "900", letterSpacing: 0.4,
  },
  dateBadgeBottom: {
    fontSize: 13, fontWeight: "900", color: COLORS.text, marginTop: 1,
  },
  detailsPanel: {
    flex: 1, minWidth: 0,
  },
  cardHeaderRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4,
  },
  service:    { fontSize: 15, fontWeight: "800", color: COLORS.text, flex: 1 },
  provider:   { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },

  aiAgentChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.full,
    paddingHorizontal: 9, paddingVertical: 4, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.primary + "44",
  },
  aiAgentChipText: { fontSize: 10, color: COLORS.primary, ...FONTS.semiBold },

  divider:    { height: 1, backgroundColor: COLORS.border, marginBottom: 10 },
  metaRow:    { flexDirection: "row", gap: 16, marginBottom: 8, alignItems: "center" },
  metaItem:   { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText:   { fontSize: 12, color: COLORS.textSecondary },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  addressText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },

  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 12, paddingVertical: 9,
    borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.danger + "44",
    backgroundColor: COLORS.dangerGlow,
  },
  cancelBtnText: { fontSize: 13, color: COLORS.danger, ...FONTS.semiBold },

  transcriptBtn: { marginTop: 12, borderRadius: RADIUS.md, overflow: "hidden", borderWidth: 1, borderColor: COLORS.primary + "33" },
  transcriptBtnGrad: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12 },
  transcriptBtnText: { fontSize: 12, color: COLORS.primary, ...FONTS.semiBold },

  empty:      { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.text },
  emptySub:   { fontSize: 13, color: COLORS.textMuted },
});

// ── Negotiation panel styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  negotiationBox: {
    marginTop: 12, borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.warning + "44",
    backgroundColor: COLORS.surface, padding: 12,
    position: "relative",
  },
  negHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  negDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warning,
    shadowColor: COLORS.warning, shadowOpacity: 0.9, shadowRadius: 4,
  },
  negTitle:     { fontSize: 12, ...FONTS.bold, color: COLORS.warning },
  suggestedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  suggestedTime:{ fontSize: 15, ...FONTS.extraBold, color: COLORS.warning },
  negHint:      { fontSize: 11, color: COLORS.textMuted, marginBottom: 12 },

  // Three-button row
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  actionBtn: {
    flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  actionBtnText: { fontSize: 11, ...FONTS.semiBold },
  actionBtnAccept: { borderColor: COLORS.success + "55", backgroundColor: COLORS.success + "12" },
  actionBtnCounter: { borderColor: COLORS.primary + "55", backgroundColor: COLORS.primaryGlow },
  actionBtnCounterActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "22" },
  actionBtnReject: { borderColor: COLORS.danger + "44", backgroundColor: COLORS.dangerGlow },

  // Counter-propose section
  counterSection: { marginTop: 10 },
  counterLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 6, ...FONTS.semiBold },
  counterInput: {
    backgroundColor: COLORS.card, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.primary + "55",
    paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.text, fontSize: 13, marginBottom: 8,
  },
  counterSendBtn:         { borderRadius: 10, overflow: "hidden" },
  counterSendBtnDisabled: { opacity: 0.5 },
  counterSendGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 11,
  },
  counterSendText: { color: "#fff", fontSize: 13, ...FONTS.bold },
  negCallingText: { fontSize: 12, color: COLORS.primary, ...FONTS.semiBold },
});

// ── TranscriptModal styles ─────────────────────────────────────────────────────
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
  scrollContent: { alignItems: "center", padding: 24, paddingBottom: 40, width: "100%" },
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
  receiptRowLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255, 255, 255, 0.65)" },
  receiptRowValue: { fontSize: 13, fontWeight: "800", color: "#FFFFFF", textAlign: "right", flex: 1 },

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

  footer: { paddingHorizontal: 20, paddingTop: 12 },
  doneBtn: { width: "100%", borderRadius: 16, overflow: "hidden" },
  doneBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
