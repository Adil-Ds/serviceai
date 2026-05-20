import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FONTS, RADIUS } from "../constants/theme";
import { API } from "../services/api";

const TIME_SLOTS = [
  "09:00 AM – 11:00 AM",
  "11:00 AM – 01:00 PM",
  "02:00 PM – 04:00 PM",
  "04:00 PM – 06:00 PM",
];

export default function BookingScreen({ route, navigation }) {
  const { provider: rankedProvider, intent } = route.params;
  const p = rankedProvider.provider;

  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [userAddress, setUserAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!userAddress.trim()) {
      Alert.alert("Address Required", "Please enter your address.");
      return;
    }
    setLoading(true);
    try {
      const booking = {
        provider_id: p.id,
        provider_name: p.name,
        service_category: p.category,
        user_name: "Guest User",
        location_address: userAddress,
        date: intent?.date || new Date().toISOString().split("T")[0],
        time_slot: selectedSlot,
        price_agreed: p.price_min,
      };
      const confirmation = await API.book(booking, p.phone);
      // Agent 5 — schedule follow-ups
      const followups = await API.scheduleFollowups(confirmation);
      navigation.navigate("FollowUp", { confirmation, followups });
    } catch (e) {
      Alert.alert("Booking Failed", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📋 Confirm Booking</Text>

        {/* Provider summary */}
        <View style={styles.providerCard}>
          <Text style={styles.providerName}>{p.name}</Text>
          <Text style={styles.providerMeta}>
            ⭐ {p.rating} · {p.review_count} reviews · {p.category.replace("_", " ")}
          </Text>
          <Text style={styles.providerMeta}>📍 {p.area}, {p.city}</Text>
          <Text style={styles.providerMeta}>📞 {p.phone}</Text>
          <Text style={styles.price}>₨{p.price_min.toLocaleString()} – ₨{p.price_max.toLocaleString()}</Text>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Date</Text>
          <View style={styles.dateBox}>
            <Text style={styles.dateText}>{intent?.date || "Today"}</Text>
          </View>
        </View>

        {/* Time Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕙 Select Time Slot</Text>
          {TIME_SLOTS.map((slot) => (
            <TouchableOpacity
              key={slot}
              style={[styles.slotBtn, selectedSlot === slot && styles.slotBtnActive]}
              onPress={() => setSelectedSlot(slot)}
            >
              <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextActive]}>
                {slot}
              </Text>
              {selectedSlot === slot && <Text style={styles.slotCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Your Address</Text>
          <TextInput
            style={styles.input}
            value={userAddress}
            onChangeText={setUserAddress}
            placeholder="e.g. House 45, Block 7, Gulshan-e-Iqbal"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Price agreed */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLbl}>Agreed Price</Text>
          <Text style={styles.priceAmt}>₨{p.price_min.toLocaleString()}</Text>
        </View>

        {/* Book CTA */}
        <TouchableOpacity
          style={[styles.bookBtn, loading && styles.btnDisabled]}
          onPress={handleBook}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>✅ Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, ...FONTS.bold, color: COLORS.text, marginBottom: 20 },
  providerCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.primary + "44",
  },
  providerName: { fontSize: 17, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  providerMeta: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 3 },
  price: { fontSize: 15, ...FONTS.semiBold, color: COLORS.success, marginTop: 6 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.medium, marginBottom: 10 },
  dateBox: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  dateText: { color: COLORS.text, fontSize: 14, ...FONTS.semiBold },
  slotBtn: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  slotBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "11" },
  slotText: { fontSize: 14, color: COLORS.textSecondary },
  slotTextActive: { color: COLORS.text, ...FONTS.semiBold },
  slotCheck: { color: COLORS.primary, fontSize: 16 },
  input: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: 14, color: COLORS.text, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  priceRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.success + "44",
  },
  priceLbl: { fontSize: 14, color: COLORS.textSecondary },
  priceAmt: { fontSize: 18, ...FONTS.bold, color: COLORS.success },
  bookBtn: {
    backgroundColor: COLORS.success, borderRadius: RADIUS.lg,
    paddingVertical: 16, alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  bookBtnText: { color: "#fff", fontSize: 16, ...FONTS.semiBold },
});
