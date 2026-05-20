import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../constants/theme";
import { API } from "../services/api";

const PENDING_CALL_KEY = "serviceai_pending_call";

export const TIME_CHIPS = [
  { label: "ASAP",     value: "As soon as possible", icon: "flash-outline" },
  { label: "Today",    value: "Today",                icon: "today-outline" },
  { label: "Tomorrow", value: "Tomorrow",             icon: "calendar-outline" },
  { label: "Custom",   value: "",                     icon: "time-outline" },
];

export const OUTCOME_CFG = {
  ACCEPTED:       { icon: "checkmark-circle", color: COLORS.success,  title: "Booking Confirmed!",         sub: "Provider accepted your request" },
  SUGGESTED_TIME: { icon: "time",             color: COLORS.warning,  title: "Provider Suggested a Time",  sub: "They can't do your original slot" },
  REJECTED:       { icon: "close-circle",     color: COLORS.danger,   title: "Provider Unavailable",       sub: "They declined the request" },
  USER_REJECTED:  { icon: "close-circle",     color: COLORS.danger,   title: "Time Declined",              sub: "You rejected the provider's suggested time" },
  NO_ANSWER:      { icon: "call-outline",     color: COLORS.textMuted,title: "No Answer",                  sub: "Provider didn't pick up" },
  FAILED:         { icon: "alert-circle",     color: COLORS.danger,   title: "Call Failed",                sub: "Could not reach the provider" },
};

export function toE164(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92") && digits.length >= 12) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith("0") && digits.length === 11) return `+92${digits.slice(1)}`;
  if (digits.length === 10) return `+92${digits}`;
  return `+${digits}`;
}

export default function BookingModal({ visible, biz, service, searchLocation, userName, userPhone, onClose, onCallComplete }) {
  const [phase,        setPhase]       = useState("form");
  const [timeChip,     setTimeChip]    = useState(0);
  const [customTime,   setCustomTime]  = useState("");
  const [problem,      setProblem]     = useState("");
  const [callLogId,    setCallLogId]   = useState(null);
  const [callData,     setCallData]    = useState(null);
  const [counterTime,  setCounterTime] = useState("");
  const [confirmPhase, setConfirmPhase]= useState("idle");

  const slideAnim        = useRef(new Animated.Value(600)).current;
  const pulseAnim        = useRef(new Animated.Value(1)).current;
  const spinAnim         = useRef(new Animated.Value(0)).current;
  const checkAnim        = useRef(new Animated.Value(0)).current;
  const pollRef          = useRef(null);
  const pulseLoopRef     = useRef(null);
  const spinLoopRef      = useRef(null);
  const modalVisibleRef  = useRef(visible);
  const onCallCompleteRef = useRef(onCallComplete);

  useEffect(() => { modalVisibleRef.current = visible; }, [visible]);
  useEffect(() => { onCallCompleteRef.current = onCallComplete; }, [onCallComplete]);

  useEffect(() => {
    if (visible && biz) {
      setPhase("form");
      setTimeChip(0);
      setCustomTime("");
      setProblem("");
      setCallLogId(null);
      setCallData(null);
      setCounterTime("");
      setConfirmPhase("idle");
      slideAnim.setValue(600);
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }).start();
    } else {
      // Do NOT clear the poll interval — let it keep running in background.
      // Only stop the visual animations since the modal is hidden.
      pulseLoopRef.current?.stop();
      spinLoopRef.current?.stop();
    }
  }, [visible, biz]);

  const startPulse = () => {
    pulseAnim.setValue(1);
    pulseLoopRef.current = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
    ]));
    pulseLoopRef.current.start();
  };

  const startSpin = () => {
    spinAnim.setValue(0);
    spinLoopRef.current = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 2200, useNativeDriver: true })
    );
    spinLoopRef.current.start();
  };

  const stopAnims = () => {
    pulseLoopRef.current?.stop();
    spinLoopRef.current?.stop();
  };

  const startCheckAnim = () => {
    checkAnim.setValue(0);
    Animated.spring(checkAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  };

  const startPolling = useCallback((logId) => {
    const TERMINAL = new Set(["COMPLETED", "FAILED", "NO_ANSWER", "REJECTED"]);
    pollRef.current = setInterval(async () => {
      try {
        const data = await API.getCallStatus(logId);
        const isTerminal = TERMINAL.has(data.status) || TERMINAL.has(data.outcome);
        if (isTerminal) {
          clearInterval(pollRef.current);
          stopAnims();
          await AsyncStorage.removeItem(PENDING_CALL_KEY);
          setCallData(data);
          startCheckAnim();
          setPhase("outcome");
          // If modal is not visible, notify the user via Alert and fire the callback
          if (!modalVisibleRef.current) {
            const cfg = OUTCOME_CFG[data.outcome] || OUTCOME_CFG[data.status] || OUTCOME_CFG.FAILED;
            Alert.alert(
              `AI Agent: ${cfg.title}`,
              cfg.sub + (data.reason ? `\n\n${data.reason}` : ""),
              [{ text: "OK" }]
            );
            onCallCompleteRef.current?.(data);
          }
        }
      } catch (_) {}
    }, 8000);
  }, []);

  const preferredTime = timeChip === 3
    ? (customTime.trim() || "As soon as possible")
    : TIME_CHIPS[timeChip].value;

  const handleConfirm = async () => {
    setPhase("calling");
    startPulse();
    startSpin();
    try {
      const res = await API.initiateCall({
        provider_phone: toE164(biz?.phone),
        provider_name:  biz?.name || "Provider",
        user_name:      userName || "Customer",
        user_address:   searchLocation || biz?.address || "",
        problem:        problem.trim() || service || "Service required",
        service_type:   service || "Service",
        preferred_time: preferredTime,
        language:       "ur",
        user_phone:     userPhone || null,
        booking_id:     null,
      });
      const logId = res?.call_log_id;
      setCallLogId(logId);
      if (logId) {
        // Persist so the app can resume polling if closed and reopened
        await AsyncStorage.setItem(PENDING_CALL_KEY, JSON.stringify({
          call_log_id:   logId,
          provider_name: biz?.name || "Provider",
          service_type:  service || "Service",
          timestamp:     Date.now(),
        }));
        startPolling(logId);
      }
    } catch (err) {
      stopAnims();
      setCallData({ status: "FAILED", outcome: "FAILED", reason: err.message || "Network error" });
      startCheckAnim();
      setPhase("outcome");
    }
  };

  const handleAccept = async () => {
    setConfirmPhase("calling");
    try {
      const res = await API.confirmCall(callLogId, "ACCEPT");
      if (res?.call_log_id) setCallLogId(res.call_log_id);
      setCallData(res);
      // Provider might negotiate again even on accept — keep UI interactive
      if (res?.outcome === "SUGGESTED_TIME") {
        setConfirmPhase("idle");
        setCounterTime("");
      } else {
        setConfirmPhase("done");
      }
    } catch {
      setConfirmPhase("done");
    }
  };

  const handleCounter = async () => {
    if (!counterTime.trim()) return;
    setConfirmPhase("calling");
    try {
      const res = await API.confirmCall(callLogId, "COUNTER", counterTime.trim());
      // Always update to the new call log so subsequent counters reference the right row
      if (res?.call_log_id) setCallLogId(res.call_log_id);
      setCallData(res);
      setPhase("outcome");
      // If the provider AGAIN suggests a different time, reset so the user can respond
      if (res?.outcome === "SUGGESTED_TIME") {
        setConfirmPhase("idle");
        setCounterTime("");
      } else {
        setConfirmPhase("done");
      }
    } catch {
      setConfirmPhase("done");
    }
  };

  const handleReject = async () => {
    setConfirmPhase("calling");
    try {
      const res = await API.confirmCall(callLogId, "REJECT");
      if (res?.call_log_id) setCallLogId(res.call_log_id);
      setCallData(res);
      setPhase("outcome");
      setConfirmPhase("done");
    } catch {
      setConfirmPhase("done");
    }
  };

  const spinDeg    = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const outcomeCfg = OUTCOME_CFG[callData?.outcome] || OUTCOME_CFG[callData?.status] || OUTCOME_CFG.FAILED;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={bm.overlay}>
        <Animated.View style={[bm.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={bm.handle} />

          {/* ── FORM ── */}
          {phase === "form" && (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <LinearGradient
                  colors={["rgba(108,99,255,0.18)", "rgba(108,99,255,0.06)"]}
                  style={bm.providerBanner}
                >
                  <LinearGradient colors={[COLORS.primary, COLORS.violet]} style={bm.providerIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="storefront-outline" size={18} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={bm.providerName} numberOfLines={2}>{biz?.name}</Text>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                      {biz?.rating && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Ionicons name="star" size={11} color={COLORS.warning} />
                          <Text style={bm.providerMeta}>{biz.rating}</Text>
                        </View>
                      )}
                      {biz?.distance_km != null && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Ionicons name="navigate-outline" size={11} color={COLORS.success} />
                          <Text style={bm.providerMeta}>{biz.distance_km} km</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={onClose} style={bm.closeX}>
                    <Ionicons name="close" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </LinearGradient>

                <Text style={bm.sectionLabel}>WHEN DO YOU NEED THIS?</Text>
                <View style={bm.chips}>
                  {TIME_CHIPS.map((c, i) => (
                    <TouchableOpacity key={i} onPress={() => setTimeChip(i)} style={[bm.chip, timeChip === i && bm.chipActive]} activeOpacity={0.8}>
                      <Ionicons name={c.icon} size={12} color={timeChip === i ? "#fff" : COLORS.textMuted} />
                      <Text style={[bm.chipText, timeChip === i && { color: "#fff" }]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {timeChip === 3 && (
                  <TextInput style={bm.customInput} value={customTime} onChangeText={setCustomTime} placeholder="e.g. Saturday 10am" placeholderTextColor={COLORS.textDim} />
                )}

                <Text style={bm.sectionLabel}>DESCRIBE YOUR ISSUE</Text>
                <View style={bm.problemBox}>
                  <TextInput
                    style={bm.problemInput}
                    value={problem}
                    onChangeText={setProblem}
                    multiline numberOfLines={3}
                    textAlignVertical="top"
                    placeholder="What needs to be fixed or done?"
                    placeholderTextColor={COLORS.textDim}
                  />
                </View>

                <LinearGradient colors={[COLORS.primary + "1A", COLORS.violet + "0D"]} style={bm.agentNotice} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={bm.agentNoticeTitle}>AI Voice Agent calls automatically</Text>
                    <Text style={bm.agentNoticeText}>Our agent will call {biz?.name} in Urdu/English, negotiate availability, and report back — no action needed from you</Text>
                  </View>
                </LinearGradient>

                <TouchableOpacity onPress={handleConfirm} style={bm.confirmBtn} activeOpacity={0.87}>
                  <LinearGradient colors={[COLORS.primary, COLORS.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={bm.confirmBtnGrad}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={bm.confirmBtnText}>Confirm & Send AI Agent</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* ── CALLING ── */}
          {phase === "calling" && (
            <View style={bm.centeredPhase}>
              <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
                <Animated.View style={[bm.spinRing, { transform: [{ rotate: spinDeg }] }]} />
                <Animated.View style={[bm.spinRingInner, { transform: [{ rotate: spinDeg }, { scaleX: -1 }] }]} />
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <LinearGradient colors={[COLORS.primary, COLORS.violet]} style={bm.callOrb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="call" size={26} color="#fff" />
                  </LinearGradient>
                </Animated.View>
              </View>

              <Text style={bm.callingTitle}>AI Agent Calling…</Text>
              <Text style={bm.callingProvider} numberOfLines={1}>{biz?.name}</Text>
              <Text style={bm.callingNote}>Speaking in Urdu · Negotiating your slot</Text>

              <View style={bm.callingSteps}>
                {[
                  { label: "Call dispatched",      done: true },
                  { label: "Ringing provider",     done: !!callLogId, active: !callLogId },
                  { label: "Analyzing transcript", done: false, active: !!callLogId },
                  { label: "Result ready",         done: false },
                ].map((step, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <View style={[bm.stepDot, step.done && { backgroundColor: COLORS.success }, step.active && { backgroundColor: COLORS.primary }]}>
                      {step.done   && <Ionicons name="checkmark" size={8} color="#fff" />}
                      {step.active && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" }} />}
                    </View>
                    <Text style={[bm.stepLabel, step.active && { color: COLORS.text, fontWeight: "700" }, step.done && { color: COLORS.success }]}>{step.label}</Text>
                  </View>
                ))}
              </View>

              <Text style={bm.estTime}>Estimated wait: 3-7 minutes</Text>
              <TouchableOpacity onPress={onClose} style={bm.closeLinkBtn}>
                <Text style={bm.closeLinkText}>Close — we'll notify you when done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── OUTCOME ── */}
          {phase === "outcome" && callData && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={bm.centeredPhase}>
              <Animated.View style={{ transform: [{ scale: checkAnim }], marginBottom: 16 }}>
                <View style={[bm.outcomeCircle, { backgroundColor: outcomeCfg.color + "22", borderColor: outcomeCfg.color + "55" }]}>
                  <Ionicons name={outcomeCfg.icon} size={44} color={outcomeCfg.color} />
                </View>
              </Animated.View>

              <Text style={bm.outcomeTitle}>{outcomeCfg.title}</Text>
              <Text style={bm.outcomeSub}>{outcomeCfg.sub}</Text>

              {callData.reason ? (
                <View style={bm.reasonBox}>
                  <Ionicons name="chatbubble-outline" size={12} color={COLORS.primary} />
                  <Text style={bm.reasonText}>{callData.reason}</Text>
                </View>
              ) : null}

              {callData.outcome === "SUGGESTED_TIME" && callData.suggested_time && confirmPhase !== "done" && (
                <View style={bm.suggestBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <View style={[bm.stepDot, { backgroundColor: COLORS.warning, width: 22, height: 22 }]}>
                      <Ionicons name="time" size={12} color="#fff" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: "700" }}>PROVIDER SUGGESTED</Text>
                      <Text style={{ fontSize: 15, fontWeight: "900", color: COLORS.warning }}>{callData.suggested_time}</Text>
                    </View>
                  </View>

                  {confirmPhase === "idle" && (
                    <>
                      <TouchableOpacity onPress={handleAccept} style={bm.acceptBtn} activeOpacity={0.87}>
                        <LinearGradient colors={[COLORS.success, COLORS.successDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={bm.acceptBtnGrad}>
                          <Ionicons name="checkmark-circle" size={16} color="#fff" />
                          <Text style={bm.acceptBtnText}>Accept {callData.suggested_time}</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <Text style={[bm.sectionLabel, { textAlign: "center", marginTop: 10 }]}>OR PROPOSE DIFFERENT TIME</Text>
                      <TextInput
                        style={bm.customInput}
                        value={counterTime}
                        onChangeText={setCounterTime}
                        placeholder="e.g. Wednesday 2pm"
                        placeholderTextColor={COLORS.textDim}
                      />
                      {counterTime.trim() ? (
                        <TouchableOpacity onPress={handleCounter} style={[bm.confirmBtn, { marginTop: 8 }]} activeOpacity={0.87}>
                          <LinearGradient colors={[COLORS.primary, COLORS.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={bm.confirmBtnGrad}>
                            <Ionicons name="repeat-outline" size={16} color="#fff" />
                            <Text style={bm.confirmBtnText}>Counter with {counterTime}</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity onPress={handleReject} style={bm.rejectBtn} activeOpacity={0.8}>
                        <Ionicons name="close-circle-outline" size={14} color={COLORS.danger} />
                        <Text style={bm.rejectBtnText}>Decline — I'll find another provider</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {confirmPhase === "calling" && (
                    <View style={{ alignItems: "center", paddingVertical: 16 }}>
                      <Ionicons name="call" size={28} color={COLORS.primary} />
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 8 }}>AI Agent calling again…</Text>
                    </View>
                  )}

                  {confirmPhase === "done" && (
                    <View style={{ alignItems: "center", paddingVertical: 16 }}>
                      <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                      <Text style={{ color: COLORS.success, fontSize: 13, fontWeight: "700", marginTop: 8 }}>
                        {callData?.outcome === "ACCEPTED" ? "Booking Confirmed!" : "Response sent"}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {callData.transcript && callData.transcript.length > 20 && (
                <View style={bm.transcriptBox}>
                  <Text style={bm.transcriptLabel}>CALL TRANSCRIPT</Text>
                  <Text style={bm.transcriptText} numberOfLines={6}>{callData.transcript}</Text>
                </View>
              )}

              <TouchableOpacity onPress={onClose} style={bm.doneBtn} activeOpacity={0.85}>
                <Text style={bm.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const bm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.borderLight, maxHeight: "92%", paddingBottom: 32 },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.borderLight, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  providerBanner: { flexDirection: "row", alignItems: "flex-start", gap: 12, margin: 14, marginBottom: 4, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.primary + "33" },
  providerIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  providerName: { fontSize: 15, fontWeight: "800", color: COLORS.text, lineHeight: 20 },
  providerMeta: { fontSize: 11, color: COLORS.textSecondary },
  closeX: { width: 28, height: 28, borderRadius: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 9, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1.4, marginHorizontal: 18, marginTop: 16, marginBottom: 10 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 14, flexWrap: "wrap", marginBottom: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
  customInput: { marginHorizontal: 14, marginTop: 8, marginBottom: 4, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 14 },
  problemBox: { marginHorizontal: 14, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  problemInput: { color: COLORS.text, fontSize: 13, lineHeight: 20, minHeight: 70 },
  agentNotice: { margin: 14, marginTop: 14, flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary + "33" },
  agentNoticeTitle: { fontSize: 11, fontWeight: "800", color: COLORS.primary, marginBottom: 3 },
  agentNoticeText: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  confirmBtn: { marginHorizontal: 14, marginTop: 16, borderRadius: 16, overflow: "hidden" },
  confirmBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  centeredPhase: { alignItems: "center", padding: 28, paddingTop: 16, paddingBottom: 32 },
  spinRing: { position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 2.5, borderColor: COLORS.primary + "99", borderTopColor: COLORS.primary, borderRightColor: "transparent" },
  spinRingInner: { position: "absolute", width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, borderColor: COLORS.violet + "66", borderBottomColor: COLORS.violet, borderLeftColor: "transparent" },
  callOrb: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOpacity: 0.55, shadowRadius: 18, elevation: 10 },
  callingTitle: { fontSize: 22, fontWeight: "900", color: COLORS.text, marginBottom: 4 },
  callingProvider: { fontSize: 14, fontWeight: "700", color: COLORS.primary, marginBottom: 6, maxWidth: 260, textAlign: "center" },
  callingNote: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 24 },
  callingSteps: { width: "100%", maxWidth: 260, marginBottom: 20 },
  stepDot: { width: 18, height: 18, borderRadius: 6, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  stepLabel: { fontSize: 11, color: COLORS.textMuted },
  estTime: { fontSize: 10, color: COLORS.textDim, marginBottom: 20 },
  closeLinkBtn: { paddingVertical: 10 },
  closeLinkText: { fontSize: 12, color: COLORS.textMuted, textDecorationLine: "underline" },
  outcomeCircle: { width: 88, height: 88, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  outcomeTitle: { fontSize: 22, fontWeight: "900", color: COLORS.text, marginTop: 12, marginBottom: 4 },
  outcomeSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 },
  reasonBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: COLORS.primaryGlow, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.primary + "33", maxWidth: 300 },
  reasonText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  suggestBox: { width: "100%", backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: COLORS.warning + "44" },
  acceptBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 8 },
  acceptBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  acceptBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  transcriptBox: { width: "100%", backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, maxWidth: 300 },
  transcriptLabel: { fontSize: 8, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: 6 },
  transcriptText: { fontSize: 10.5, color: COLORS.textSecondary, lineHeight: 16, fontFamily: "Courier New" },
  doneBtn: { width: "100%", maxWidth: 300, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", paddingVertical: 14 },
  doneBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: "800" },
});
