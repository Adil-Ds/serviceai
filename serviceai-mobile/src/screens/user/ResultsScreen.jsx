import React, { useRef, useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated,
  Pressable, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import BookingModal from "../../components/BookingModal";

const RANK_GRAD = [
  ["#92701A", "#D4A017"],
  ["#606060", "#A8A8A8"],
  ["#5C3010", "#9E6030"],
];

// ── AI Report ─────────────────────────────────────────────────────────────────
function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false);
  const [displayed, setDisplayed] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!expanded || !report) return;
    setDisplayed("");
    let idx = 0;
    const iv = setInterval(() => {
      idx = Math.min(idx + 4, report.length);
      setDisplayed(report.slice(0, idx));
      if (idx >= report.length) clearInterval(iv);
    }, 14);
    return () => clearInterval(iv);
  }, [expanded, report]);

  if (!report) return null;

  return (
    <Animated.View style={[styles.reportCard, { opacity: fadeAnim }]}>
      <LinearGradient colors={["rgba(108,99,255,0.10)", "transparent"]} style={StyleSheet.absoluteFill} />
      <Pressable onPress={() => setExpanded(e => !e)} style={styles.reportHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={styles.reportDot} />
          <Text style={styles.reportTitle}>AI ANALYSIS REPORT</Text>
          <View style={styles.modelBadge}><Text style={styles.modelBadgeText}>Groq</Text></View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={COLORS.textMuted} />
      </Pressable>
      {expanded ? (
        <View style={styles.reportBody}>
          <Text style={styles.reportText}>{displayed || report}</Text>
        </View>
      ) : (
        <Text style={styles.reportPreview} numberOfLines={2}>{report}</Text>
      )}
    </Animated.View>
  );
}

// ── Score Bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max, color, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 650, delay, useNativeDriver: false }).start();
  }, []);
  const pct = anim.interpolate({ inputRange: [0, max || 100], outputRange: ["0%", "100%"] });
  return (
    <View style={styles.scoreBarRow}>
      <Text style={styles.scoreBarLabel}>{label}</Text>
      <View style={styles.scoreBarBg}>
        <Animated.View style={[styles.scoreBarFill, { width: pct, backgroundColor: color }]} />
      </View>
      <Text style={[styles.scoreBarVal, { color }]}>{Math.round(value)}</Text>
    </View>
  );
}

// ── Booking Modal (inline copy kept for file integrity — shared via BookingModal.jsx) ──
function _BookingModalPlaceholder({ visible, biz, service, searchLocation, userName, onClose }) {
  // phases: form → calling → outcome → counter
  const [phase,       setPhase]      = useState("form");
  const [timeChip,    setTimeChip]   = useState(0);
  const [customTime,  setCustomTime] = useState("");
  const [problem,     setProblem]    = useState("");
  const [callLogId,   setCallLogId]  = useState(null);
  const [callData,    setCallData]   = useState(null); // result from /status
  const [counterTime, setCounterTime]= useState("");
  const [confirmPhase,setConfirmPhase]=useState("idle"); // idle | calling | done
  const slideAnim  = useRef(new Animated.Value(600)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const spinAnim   = useRef(new Animated.Value(0)).current;
  const checkAnim  = useRef(new Animated.Value(0)).current;
  const pollRef    = useRef(null);
  const pulseLoopRef = useRef(null);
  const spinLoopRef  = useRef(null);

  // Reset & slide in
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
      clearInterval(pollRef.current);
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

  // Poll /status every 8s until terminal status
  const startPolling = useCallback((logId) => {
    const TERMINAL = new Set(["COMPLETED", "FAILED", "NO_ANSWER", "REJECTED"]);
    pollRef.current = setInterval(async () => {
      try {
        const data = await API.getCallStatus(logId);
        if (TERMINAL.has(data.status) || TERMINAL.has(data.outcome)) {
          clearInterval(pollRef.current);
          stopAnims();
          setCallData(data);
          startCheckAnim();
          setPhase("outcome");
        }
      } catch (_) { /* network hiccup — keep polling */ }
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
        booking_id:     null,
      });
      const logId = res?.call_log_id;
      setCallLogId(logId);
      if (logId) startPolling(logId);
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
      setCallData(res);
      setConfirmPhase("done");
    } catch {
      setConfirmPhase("done");
    }
  };

  const handleCounter = async () => {
    if (!counterTime.trim()) return;
    setConfirmPhase("calling");
    try {
      const res = await API.confirmCall(callLogId, "COUNTER", counterTime.trim());
      setCallData(res);
      setPhase("outcome");
      setConfirmPhase("done");
    } catch {
      setConfirmPhase("done");
    }
  };

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
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
                {/* Provider banner */}
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

                {/* Time chips */}
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

                {/* Problem */}
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

                {/* AI agent note */}
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
              {/* Spinning ring */}
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
                  { label: "Call dispatched",       done: true },
                  { label: "Ringing provider",      done: !!callLogId, active: !callLogId },
                  { label: "Analyzing transcript",  done: false, active: !!callLogId },
                  { label: "Result ready",          done: false },
                ].map((s, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <View style={[bm.stepDot, s.done && { backgroundColor: COLORS.success }, s.active && { backgroundColor: COLORS.primary }]}>
                      {s.done && <Ionicons name="checkmark" size={8} color="#fff" />}
                      {s.active && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" }} />}
                    </View>
                    <Text style={[bm.stepLabel, s.active && { color: COLORS.text, fontWeight: "700" }, s.done && { color: COLORS.success }]}>{s.label}</Text>
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
              {/* Outcome icon */}
              <Animated.View style={{ transform: [{ scale: checkAnim }], marginBottom: 16 }}>
                <View style={[bm.outcomeCircle, { backgroundColor: outcomeCfg.color + "22", borderColor: outcomeCfg.color + "55" }]}>
                  <Ionicons name={outcomeCfg.icon} size={44} color={outcomeCfg.color} />
                </View>
              </Animated.View>

              <Text style={bm.outcomeTitle}>{outcomeCfg.title}</Text>
              <Text style={bm.outcomeSub}>{outcomeCfg.sub}</Text>

              {/* Reason */}
              {callData.reason ? (
                <View style={bm.reasonBox}>
                  <Ionicons name="chatbubble-outline" size={12} color={COLORS.primary} />
                  <Text style={bm.reasonText}>{callData.reason}</Text>
                </View>
              ) : null}

              {/* SUGGESTED_TIME branch */}
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

              {/* Transcript snippet */}
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

// ── Business Card ─────────────────────────────────────────────────────────────
function BusinessCard({ biz, delay, onBook }) {
  const rank   = biz.rank || 1;
  const isGold = rank === 1;
  const grad   = RANK_GRAD[rank - 1] || RANK_GRAD[2];
  const [expanded, setExpanded] = useState(rank === 1);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(36)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8,   delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 14 }}>
      <View style={[styles.card, isGold && styles.cardGold]}>
        {isGold && <LinearGradient colors={["rgba(255,215,0,0.07)", "transparent"]} style={styles.cardShimmer} />}

        <View style={styles.cardHeader}>
          <LinearGradient colors={grad} style={styles.rankBadge}>
            <Text style={styles.rankText}>#{rank}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.bizName} numberOfLines={2}>{biz.name || "Unknown"}</Text>
            {biz.address ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.bizAddress} numberOfLines={1}>{biz.address}</Text>
              </View>
            ) : null}
          </View>
          <Pressable onPress={() => setExpanded(e => !e)} style={styles.expandBtn}>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          {biz.rating != null && (
            <View style={styles.statPill}>
              <Ionicons name="star" size={13} color={COLORS.warning} />
              <Text style={styles.statVal}>{biz.rating}</Text>
              <Text style={styles.statSub}>rating</Text>
            </View>
          )}
          {biz.review_count != null && (
            <View style={styles.statPill}>
              <Ionicons name="people-outline" size={13} color={COLORS.info} />
              <Text style={styles.statVal}>{biz.review_count}</Text>
              <Text style={styles.statSub}>reviews</Text>
            </View>
          )}
          {biz.distance_km != null && (
            <View style={styles.statPill}>
              <Ionicons name="navigate-outline" size={13} color={COLORS.success} />
              <Text style={styles.statVal}>{biz.distance_km}km</Text>
              <Text style={styles.statSub}>away</Text>
            </View>
          )}
          {biz.total_score > 0 && (
            <View style={[styles.statPill, { borderColor: COLORS.primary + "55" }]}>
              <Ionicons name="sparkles-outline" size={13} color={COLORS.primary} />
              <Text style={[styles.statVal, { color: COLORS.primary }]}>{Math.round(biz.total_score)}</Text>
              <Text style={styles.statSub}>score</Text>
            </View>
          )}
        </View>

        {expanded && (biz.rating_score > 0 || biz.review_score > 0 || biz.distance_score > 0) && (
          <View style={styles.breakdown}>
            <Text style={styles.breakdownTitle}>SCORE BREAKDOWN</Text>
            {biz.rating_score   > 0 && <ScoreBar label="Rating"   value={biz.rating_score}   max={40} color={COLORS.warning} delay={80} />}
            {biz.review_score   > 0 && <ScoreBar label="Reviews"  value={biz.review_score}   max={30} color={COLORS.info}    delay={160} />}
            {biz.distance_score > 0 && <ScoreBar label="Distance" value={biz.distance_score} max={30} color={COLORS.success} delay={240} />}
          </View>
        )}

        <View style={styles.cardDivider} />

        <View style={styles.actions}>
          {biz.phone ? (
            <TouchableOpacity
              style={[styles.callBtn, { flex: 1 }]}
              onPress={() => Linking.openURL(`tel:${biz.phone.replace(/[\s\-()]/g, "")}`)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[COLORS.success, COLORS.successDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.callBtnGrad}>
                <Ionicons name="call" size={15} color="#fff" />
                <Text style={styles.callBtnText}>{biz.phone}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.noPhone, { flex: 1 }]}>
              <Ionicons name="call-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.noPhoneText}>No phone listed</Text>
            </View>
          )}
          {biz.website ? (
            <TouchableOpacity style={styles.webBtn} onPress={() => Linking.openURL(biz.website)} activeOpacity={0.8}>
              <Ionicons name="open-outline" size={14} color={COLORS.primary} />
              <Text style={styles.webBtnText}>Maps</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Book via AI Agent */}
        <TouchableOpacity onPress={onBook} style={styles.bookBtn} activeOpacity={0.87}>
          <LinearGradient colors={[COLORS.primary, COLORS.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookBtnGrad}>
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={styles.bookBtnText}>Book via AI Agent</Text>
            <View style={styles.bookBtnBadge}>
              <Text style={styles.bookBtnBadgeText}>AUTO</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const SORT_OPTIONS = [
  { key: "score",    label: "Best Match", icon: "sparkles-outline" },
  { key: "rating",   label: "Rating",     icon: "star-outline" },
  { key: "distance", label: "Distance",   icon: "navigate-outline" },
  { key: "reviews",  label: "Reviews",    icon: "people-outline" },
];

function sortBusinesses(list, key) {
  const arr = [...list];
  switch (key) {
    case "rating":   return arr.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    case "distance": return arr.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    case "reviews":  return arr.sort((a, b) => parseInt(b.review_count || 0) - parseInt(a.review_count || 0));
    default:         return arr.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ResultsScreen({ route, navigation }) {
  const { findResult = null, query } = route.params || {};
  const { userProfile } = useAuth();
  const [sortKey,    setSortKey]    = useState("score");
  const [bookingBiz, setBookingBiz] = useState(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const businesses = findResult?.businesses || [];
  const report     = findResult?.report || null;
  const service    = findResult?.service || query || "";
  const address    = findResult?.address || "";
  const sorted     = sortBusinesses(businesses, sortKey);
  const totalFound = businesses.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>{totalFound > 0 ? `${totalFound} Providers Found` : "No Results"}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{service}{address ? ` · ${address}` : ""}</Text>
          <View style={styles.badgeRow}>
            {totalFound > 0 && (
              <View style={styles.liveBadge}>
                <Ionicons name="globe-outline" size={11} color={COLORS.success} />
                <Text style={styles.liveBadgeText}>Google Maps · Live Data</Text>
              </View>
            )}
            {totalFound > 0 && (
              <View style={styles.scoreBadge}>
                <Ionicons name="podium-outline" size={11} color={COLORS.primary} />
                <Text style={styles.scoreBadgeText}>AI Ranked</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {report && <ReportCard report={report} />}

        {totalFound === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No providers found</Text>
            <Text style={styles.emptyText}>Try a different service or location. Google Maps may not have listings for this area yet.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.retryText}>← Try Another Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {totalFound > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key} onPress={() => setSortKey(opt.key)} style={[styles.sortChip, sortKey === opt.key && styles.sortChipActive]}>
                <Ionicons name={opt.icon} size={11} color={sortKey === opt.key ? "#fff" : COLORS.textMuted} />
                <Text style={[styles.sortChipText, sortKey === opt.key && { color: "#fff" }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {sorted.map((biz, i) => (
          <BusinessCard
            key={biz.rank || i}
            biz={{ ...biz, rank: i + 1 }}
            delay={i * 90}
            onBook={() => setBookingBiz({ ...biz, rank: i + 1 })}
          />
        ))}

        {totalFound > 0 && (
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.disclaimerText}>
              Data from Google Maps. AI Agent calls providers autonomously — you'll see the outcome here.
            </Text>
          </View>
        )}
      </ScrollView>

      <BookingModal
        visible={!!bookingBiz}
        biz={bookingBiz}
        service={service}
        searchLocation={address}
        userName={userProfile?.name || "Customer"}
        userPhone={userProfile?.phone || null}
        onClose={() => setBookingBiz(null)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 48 },
  header: { marginBottom: 18 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 24, ...FONTS.extraBold, color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.successGlow, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.success + "44" },
  liveBadgeText: { fontSize: 11, color: COLORS.success, ...FONTS.semiBold },
  scoreBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.primary + "44" },
  scoreBadgeText: { fontSize: 11, color: COLORS.primary, ...FONTS.semiBold },
  reportCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: COLORS.primary + "44", overflow: "hidden", ...SHADOWS.md },
  reportHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reportDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.8, shadowRadius: 4 },
  reportTitle: { fontSize: 10, ...FONTS.bold, color: COLORS.primary, letterSpacing: 0.8 },
  modelBadge: { backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.primary + "33" },
  modelBadgeText: { fontSize: 9, color: COLORS.primary, ...FONTS.semiBold },
  reportBody: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  reportText: { fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 20 },
  reportPreview: { fontSize: 11, color: COLORS.textMuted, lineHeight: 17, marginTop: 8, fontStyle: "italic" },
  sortChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.card, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  sortChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortChipText: { fontSize: 11, color: COLORS.textMuted, ...FONTS.semiBold },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: 16, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden", position: "relative", ...SHADOWS.md },
  cardGold: { borderColor: COLORS.warning + "55", shadowColor: COLORS.warning, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
  cardShimmer: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  rankBadge: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rankText: { color: "#000", fontSize: 13, ...FONTS.extraBold },
  bizName: { fontSize: 14, ...FONTS.bold, color: COLORS.text, lineHeight: 20 },
  bizAddress: { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  expandBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 10, marginBottom: 10 },
  statPill: { flex: 1, alignItems: "center", gap: 2, borderWidth: 1, borderColor: "transparent", minWidth: 52 },
  statVal: { fontSize: 12, ...FONTS.bold, color: COLORS.text },
  statSub: { fontSize: 9, color: COLORS.textMuted },
  breakdown: { marginBottom: 10 },
  breakdownTitle: { fontSize: 9, ...FONTS.bold, color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 8 },
  scoreBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  scoreBarLabel: { fontSize: 10, color: COLORS.textMuted, width: 52 },
  scoreBarBg: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: "hidden" },
  scoreBarFill: { height: 4, borderRadius: 2 },
  scoreBarVal: { fontSize: 10, ...FONTS.semiBold, width: 22, textAlign: "right" },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  callBtn: { borderRadius: RADIUS.md, overflow: "hidden", minWidth: 140 },
  callBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 11, paddingHorizontal: 14 },
  callBtnText: { color: "#fff", fontSize: 13, ...FONTS.semiBold, flexShrink: 1 },
  noPhone: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingVertical: 11, paddingHorizontal: 12, opacity: 0.55 },
  noPhoneText: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },
  webBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.md, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.primary + "44" },
  webBtnText: { fontSize: 13, color: COLORS.primary, ...FONTS.semiBold },
  bookBtn: { borderRadius: 14, overflow: "hidden" },
  bookBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, paddingHorizontal: 18 },
  bookBtnText: { color: "#fff", fontSize: 14, fontWeight: "800", flex: 1, textAlign: "center" },
  bookBtnBadge: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  bookBtnBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  emptyState: { alignItems: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.text },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20 },
  retryBtn: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  retryText: { color: COLORS.primary, ...FONTS.semiBold },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, marginTop: 4, borderWidth: 1, borderColor: COLORS.border },
  disclaimerText: { flex: 1, fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
});

// ── Booking modal styles ───────────────────────────────────────────────────────
const bm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.borderLight, maxHeight: "92%", paddingBottom: 32 },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.borderLight, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  // Provider banner
  providerBanner: { flexDirection: "row", alignItems: "flex-start", gap: 12, margin: 14, marginBottom: 4, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.primary + "33" },
  providerIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  providerName: { fontSize: 15, fontWeight: "800", color: COLORS.text, lineHeight: 20 },
  providerMeta: { fontSize: 11, color: COLORS.textSecondary },
  closeX: { width: 28, height: 28, borderRadius: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  // Labels
  sectionLabel: { fontSize: 9, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1.4, marginHorizontal: 18, marginTop: 16, marginBottom: 10 },
  // Chips
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 14, flexWrap: "wrap", marginBottom: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
  customInput: { marginHorizontal: 14, marginTop: 8, marginBottom: 4, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 14 },
  // Problem box
  problemBox: { marginHorizontal: 14, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  problemInput: { color: COLORS.text, fontSize: 13, lineHeight: 20, minHeight: 70 },
  // Agent notice
  agentNotice: { margin: 14, marginTop: 14, flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary + "33" },
  agentNoticeTitle: { fontSize: 11, fontWeight: "800", color: COLORS.primary, marginBottom: 3 },
  agentNoticeText: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  // Confirm button
  confirmBtn: { marginHorizontal: 14, marginTop: 16, borderRadius: 16, overflow: "hidden" },
  confirmBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  // Centered phase wrapper
  centeredPhase: { alignItems: "center", padding: 28, paddingTop: 16, paddingBottom: 32 },
  // Calling phase
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
  // Outcome phase
  outcomeCircle: { width: 88, height: 88, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  outcomeTitle: { fontSize: 22, fontWeight: "900", color: COLORS.text, marginTop: 12, marginBottom: 4 },
  outcomeSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 },
  reasonBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: COLORS.primaryGlow, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.primary + "33", maxWidth: 300 },
  reasonText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  // Suggested time
  suggestBox: { width: "100%", backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: COLORS.warning + "44" },
  acceptBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 8 },
  acceptBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  acceptBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  // Transcript
  transcriptBox: { width: "100%", backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, maxWidth: 300 },
  transcriptLabel: { fontSize: 8, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: 6 },
  transcriptText: { fontSize: 10.5, color: COLORS.textSecondary, lineHeight: 16, fontFamily: "Courier New" },
  // Done button
  doneBtn: { width: "100%", maxWidth: 300, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", paddingVertical: 14 },
  doneBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: "800" },
});
