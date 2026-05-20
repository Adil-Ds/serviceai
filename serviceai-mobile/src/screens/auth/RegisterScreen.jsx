import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS, FONTS, RADIUS, SHADOWS, SERVICE_CATEGORIES } from "../../constants/theme";

const CITIES = ["Karachi", "Lahore"];
const AREAS = {
  Karachi: ["Gulshan-e-Iqbal", "DHA", "Nazimabad", "Clifton", "North Karachi"],
  Lahore: ["DHA Lahore", "Gulberg", "Model Town", "Johar Town"],
};

export default function RegisterScreen({ route, navigation }) {
  const role = route.params?.role || "user";
  const { signUp } = useAuth();
  const isProvider = role === "provider";

  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    category: SERVICE_CATEGORIES[0].key,
    city: "Karachi", area: "Gulshan-e-Iqbal",
  });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  async function handleRegister() {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    if (form.password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (isProvider && !form.phone.trim()) {
      Alert.alert("Missing Fields", "Please enter your phone number.");
      return;
    }
    setLoading(true);
    try {
      await signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name.trim(),
        role,
        ...(isProvider && { phone: form.phone, category: form.category, city: form.city, area: form.area }),
      });
    } catch (e) {
      Alert.alert("Registration Failed", e.message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#07070F", "#0E0E1A"]} style={styles.bg}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={[styles.roleBadge, isProvider && styles.roleBadgeProvider]}>
                <Text style={styles.roleBadgeText}>{isProvider ? "🛠️ Service Provider" : "🙋 User"}</Text>
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join Pakistan's AI-powered service network</Text>
            </View>

            <View style={styles.card}>
              {/* Common fields */}
              <Field label="Full Name" value={form.name} onChange={set("name")} placeholder="Ahmed Khan" />
              <Field label="Email Address" value={form.email} onChange={set("email")} placeholder="you@example.com" keyboard="email-address" />
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.pwRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent", padding: 0 }]}
                    value={form.password} onChangeText={set("password")}
                    placeholder="Min. 6 characters" placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showPw}
                  />
                  <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                    <Text style={styles.showPw}>{showPw ? "Hide" : "Show"}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Provider-only fields */}
              {isProvider && (
                <>
                  <Field label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="0300-1234567" keyboard="phone-pad" />

                  <View style={styles.field}>
                    <Text style={styles.label}>Service Category</Text>
                    <View style={styles.chipGrid}>
                      {SERVICE_CATEGORIES.map((c) => (
                        <TouchableOpacity
                          key={c.key}
                          style={[styles.chip, form.category === c.key && styles.chipActive]}
                          onPress={() => set("category")(c.key)}
                        >
                          <Text style={styles.chipIcon}>{c.icon}</Text>
                          <Text style={[styles.chipText, form.category === c.key && styles.chipTextActive]}>
                            {c.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>City</Text>
                    <View style={styles.cityRow}>
                      {CITIES.map((c) => (
                        <TouchableOpacity
                          key={c} style={[styles.cityBtn, form.city === c && styles.cityBtnActive]}
                          onPress={() => { set("city")(c); set("area")(AREAS[c][0]); }}
                        >
                          <Text style={[styles.cityText, form.city === c && styles.cityTextActive]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Your Service Area</Text>
                    {AREAS[form.city].map((a) => (
                      <TouchableOpacity
                        key={a} style={[styles.areaBtn, form.area === a && styles.areaBtnActive]}
                        onPress={() => set("area")(a)}
                      >
                        <Text style={[styles.areaText, form.area === a && styles.areaTextActive]}>
                          {form.area === a ? "✓  " : "    "}{a}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.btn, isProvider && styles.btnProvider, loading && styles.btnDisabled]}
                onPress={handleRegister} disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login", { role })}>
                <Text style={[styles.loginLink, isProvider && styles.loginLinkProvider]}>Sign In</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, keyboard = "default" }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, { color: COLORS.text }]} value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboard} autoCapitalize="none" autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  bg: { flex: 1 },
  scroll: { padding: 24, paddingTop: 16 },
  back: { marginBottom: 20 },
  backText: { color: COLORS.textSecondary, fontSize: 14 },
  header: { marginBottom: 24 },
  roleBadge: {
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 6, alignSelf: "flex-start",
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.primary + "44",
  },
  roleBadgeProvider: { backgroundColor: COLORS.providerGlow, borderColor: COLORS.provider + "44" },
  roleBadgeText: { fontSize: 13, color: COLORS.text, ...FONTS.medium },
  title: { fontSize: 28, ...FONTS.extraBold, color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.md, marginBottom: 20,
  },
  field: { marginBottom: 18 },
  label: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.medium, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 13, color: COLORS.text, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pwRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: 13, borderWidth: 1, borderColor: COLORS.border,
  },
  showPw: { color: COLORS.primary, fontSize: 13, ...FONTS.medium, paddingVertical: 13 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { borderColor: COLORS.provider, backgroundColor: COLORS.providerGlow },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  chipTextActive: { color: COLORS.provider },
  cityRow: { flexDirection: "row", gap: 10 },
  cityBtn: {
    flex: 1, paddingVertical: 11, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface, alignItems: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  cityBtnActive: { borderColor: COLORS.provider, backgroundColor: COLORS.providerGlow },
  cityText: { color: COLORS.textSecondary, ...FONTS.medium },
  cityTextActive: { color: COLORS.provider },
  areaBtn: {
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: RADIUS.sm, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  areaBtnActive: { borderColor: COLORS.provider, backgroundColor: COLORS.providerGlow },
  areaText: { color: COLORS.textSecondary, fontSize: 13 },
  areaTextActive: { color: COLORS.provider, ...FONTS.medium },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 15, alignItems: "center", marginTop: 6,
  },
  btnProvider: { backgroundColor: COLORS.provider },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, ...FONTS.semiBold },
  loginRow: { flexDirection: "row", justifyContent: "center", marginBottom: 40 },
  loginText: { color: COLORS.textSecondary, fontSize: 14 },
  loginLink: { color: COLORS.primary, fontSize: 14, ...FONTS.semiBold },
  loginLinkProvider: { color: COLORS.provider },
});
