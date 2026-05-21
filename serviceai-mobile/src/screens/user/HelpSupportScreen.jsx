import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";

const HELPLINE   = "+923001234567";
const WHATSAPP   = "+923210000000";
const EMAIL      = "support@booknfix.pk";
const WHATSAPP_MSG = "Hello! I need help with BookNFix.";

const FAQS = [
  {
    q: "How do I find a service provider?",
    a: "Go to the Home tab and tap 'Find a Service'. Type your request in Urdu or English — our 5 AI agents will search, rank, and suggest the best providers near you.",
  },
  {
    q: "Can I cancel my booking?",
    a: "Yes! Go to the Bookings tab, find your PENDING booking, and tap 'Cancel Booking'. Once a provider confirms the booking (CONFIRMED status), cancellation is not available through the app — please call the helpline.",
  },
  {
    q: "How are providers ranked?",
    a: "Our AI Ranking Engine uses a weighted formula:\n• 35% — Proximity (Haversine distance)\n• 35% — Rating (out of 5 stars)\n• 20% — Price fit (within your budget)\n• 10% — Total reviews\n\nGroq AI (llama-3.3-70b-versatile) generates a one-sentence reason for each ranking.",
  },
  {
    q: "What payment methods are accepted?",
    a: "BookNFix is a matching platform — payment is made directly to the provider after the service. Common methods: cash, EasyPaisa, JazzCash, or bank transfer. Always agree on payment method before booking.",
  },
  {
    q: "How do I become a service provider?",
    a: "Register using the 'Sign Up' screen and select 'Service Provider' as your role. You will then have access to the Provider Dashboard where you can manage your bookings and profile.",
  },
  {
    q: "Which cities are supported?",
    a: "Currently BookNFix covers Karachi and Lahore with 50+ verified providers. More cities including Islamabad, Rawalpindi, and Faisalabad are coming soon.",
  },
  {
    q: "Is my location data safe?",
    a: "Yes. Your GPS coordinates are only used to calculate distance to nearby providers. We never store your location permanently — it is discarded after each search session.",
  },
  {
    q: "What services can I book?",
    a: "Currently available: Plumber, Electrician, Doctor, Tutor, AC Technician, Carpenter. More service categories are being added regularly.",
  },
  {
    q: "The AI agents are slow — is that normal?",
    a: "Yes, during peak hours the AI pipeline can take 10–20 seconds as Groq processes 3 sequential tool calls. This is normal — the real agent trace is shown live on screen so you can follow each step.",
  },
];

function FaqItem({ item, index }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.faqCard, open && styles.faqCardOpen]}
      onPress={() => setOpen(!open)}
      activeOpacity={0.85}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={open ? COLORS.primary : COLORS.textMuted}
        />
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

function ContactCard({ icon, label, value, onPress, color }) {
  return (
    <TouchableOpacity style={styles.contactCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.contactIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
      <Ionicons name="arrow-forward-circle-outline" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen() {
  const openPhone = () => {
    Linking.openURL(`tel:${HELPLINE}`).catch(() =>
      Alert.alert("Cannot open dialer", `Please call manually: ${HELPLINE}`)
    );
  };

  const openWhatsApp = () => {
    const url = `whatsapp://send?phone=${WHATSAPP}&text=${encodeURIComponent(WHATSAPP_MSG)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("WhatsApp not installed", `Send a message to: ${WHATSAPP}`)
    );
  };

  const openEmail = () => {
    Linking.openURL(`mailto:${EMAIL}?subject=BookNFix Support`).catch(() =>
      Alert.alert("Cannot open email", `Email us at: ${EMAIL}`)
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="headset-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>Browse FAQs below or reach us directly</Text>
        </View>

        {/* Contact Channels */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactGroup}>
          <ContactCard
            icon="call-outline"
            label="Helpline (9 AM – 9 PM)"
            value="0800-BOOKNFIX  ·  0300-1234567"
            color={COLORS.success}
            onPress={openPhone}
          />
          <ContactCard
            icon="logo-whatsapp"
            label="WhatsApp Support"
            value="+92 321-000-0000"
            color="#25D366"
            onPress={openWhatsApp}
          />
          <ContactCard
            icon="mail-outline"
            label="Email Support"
            value="support@booknfix.pk"
            color={COLORS.info}
            onPress={openEmail}
          />
        </View>

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQS.map((item, i) => (
          <FaqItem key={i} item={item} index={i} />
        ))}

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.footerText}>BookNFix v2.0 · Google Antigravity Hackathon</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 48 },

  heroCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    padding: 24, alignItems: "center", marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.primary + "33",
  },
  heroIcon: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: COLORS.primaryGlow, alignItems: "center", justifyContent: "center",
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.primary + "44",
  },
  heroTitle: { fontSize: 20, ...FONTS.extraBold, color: COLORS.text, marginBottom: 6 },
  heroSub:   { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },

  sectionTitle: {
    fontSize: 11, ...FONTS.bold, color: COLORS.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12,
  },

  contactGroup: { gap: 8, marginBottom: 28 },
  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  contactIcon: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
  },
  contactLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  contactValue: { fontSize: 13, ...FONTS.semiBold, color: COLORS.text },

  faqCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  faqCardOpen: { borderColor: COLORS.primary + "44" },
  faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  faqQ: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text, flex: 1, lineHeight: 20 },
  faqA: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 21, marginTop: 10 },

  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 16,
  },
  footerText: { fontSize: 11, color: COLORS.textMuted },
});
