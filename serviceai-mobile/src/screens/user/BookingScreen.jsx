import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { API } from "../../services/api";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";

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

  // Fetch booked slots dynamically whenever selected bookingDate is switched
  useEffect(() => {
    API.getBookedSlots(p.id, bookingDate)
      .then((slots) => setBookedSlots(slots))
      .catch(() => {}); // fail silently
  }, [bookingDate]);

  async function handleBook() {
    if (!address.trim()) {
      Alert.alert("Address Required", "Please enter your complete address.");
      return;
    }
    
    setLoading(true);
    try {
      // Embed the user-specified problem description directly into the database location field
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

      // Step 1: create the booking (critical — must succeed)
      const userPhone = userProfile?.phone || "0300-1234567";
      const confirmation = await API.book(bookingPayload, userPhone);

      // Step 2: schedule follow-ups
      let followups = null;
      try {
        followups = await API.scheduleFollowups(confirmation);
      } catch (_) {}

      navigation.navigate("Confirmation", { confirmation, followups, provider: p });
    } catch (e) {
      Alert.alert("Booking Failed", "Could not connect to the server.\n" + e.message);
    } finally {
      setLoading(false);
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
});
