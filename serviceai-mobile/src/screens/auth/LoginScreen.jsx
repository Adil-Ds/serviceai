import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS, FONTS, RADIUS, SHADOWS } from "../../constants/theme";
import BrandLogo from "../../components/BrandLogo";

function PremiumInput({ label, value, onChange, placeholder, keyboard = "default", secure, toggleSecure, icon }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [COLORS.border, COLORS.primary] });

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.inputWrap, { borderColor }]}>
        <Ionicons name={icon} size={16} color={focused ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboard}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secure}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {toggleSecure && (
          <TouchableOpacity onPress={toggleSecure}>
            <Ionicons name={secure ? "eye-outline" : "eye-off-outline"} size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

export default function LoginScreen({ route, navigation }) {
  const role = route.params?.role || "user";
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const isProvider = role === "provider";
  const accentColor = isProvider ? COLORS.provider : COLORS.primary;

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e) {
      Alert.alert("Login Failed", e.message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[COLORS.bg, COLORS.surface]} style={styles.bg}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Back */}
            <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.rolePill, { backgroundColor: accentColor + "18", borderColor: accentColor + "44" }]}>
                <Text style={[styles.rolePillText, { color: accentColor }]}>
                  {isProvider ? "🛠️ Service Provider" : "🙋 User"}
                </Text>
              </View>
              <Text style={styles.title}>Welcome back</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={styles.subtitle}>Sign in to continue to </Text>
                <BrandLogo size={14} letterSpacing={0} />
              </View>
            </View>

            {/* Form */}
            <View style={styles.card}>
              <PremiumInput
                label="Email Address"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                keyboard="email-address"
                icon="mail-outline"
              />
              <PremiumInput
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                icon="lock-closed-outline"
                secure={!showPw}
                toggleSecure={() => setShowPw(!showPw)}
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isProvider ? ["#F59E0B", "#D97706"] : ["#6C63FF", "#8B5CF6"]}
                  style={styles.btnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.btnInner}>
                      <Ionicons name="log-in-outline" size={18} color="#fff" />
                      <Text style={styles.btnText}>Sign In</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register", { role })}>
                <Text style={[styles.registerLink, { color: accentColor }]}>Register</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  bg: { flex: 1 },
  scroll: { padding: 24, paddingTop: 16, flexGrow: 1 },

  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 28 },
  backText: { color: COLORS.textSecondary, fontSize: 14 },

  header: { marginBottom: 28 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 1,
  },
  rolePillText: { fontSize: 13, ...FONTS.medium },
  title: { fontSize: 32, ...FONTS.extraBold, color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    marginBottom: 24,
  },
  field: { marginBottom: 20 },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
    ...FONTS.semiBold,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  inputIcon: { opacity: 0.7 },
  input: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 13 },

  btn: { borderRadius: RADIUS.md, overflow: "hidden", marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnGrad: { paddingVertical: 15, borderRadius: RADIUS.md },
  btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  btnText: { color: "#fff", fontSize: 16, ...FONTS.semiBold },

  registerRow: { flexDirection: "row", justifyContent: "center" },
  registerText: { color: COLORS.textSecondary, fontSize: 14 },
  registerLink: { fontSize: 14, ...FONTS.semiBold },
});
