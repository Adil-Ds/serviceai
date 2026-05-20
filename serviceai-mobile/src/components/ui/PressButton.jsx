import React, { useRef } from "react";
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONTS, RADIUS } from "../../constants/theme";

export default function PressButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon = null,
  style,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const sizeStyle = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  const renderContent = () => (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          {icon && <Text style={sizeStyle.icon}>{icon}</Text>}
          <Text style={[styles.label, sizeStyle.label]}>{label}</Text>
        </>
      )}
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={{ borderRadius: RADIUS.md, overflow: "hidden", opacity: isDisabled ? 0.55 : 1 }}
      >
        {variant === "primary" && (
          <LinearGradient colors={["#6C63FF", "#8B5CF6"]} style={[styles.base, sizeStyle.pad]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {renderContent()}
          </LinearGradient>
        )}
        {variant === "success" && (
          <LinearGradient colors={["#10D9A0", "#0CB888"]} style={[styles.base, sizeStyle.pad]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {renderContent()}
          </LinearGradient>
        )}
        {variant === "provider" && (
          <LinearGradient colors={["#F59E0B", "#D97706"]} style={[styles.base, sizeStyle.pad]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {renderContent()}
          </LinearGradient>
        )}
        {variant === "outline" && (
          <View style={[styles.base, sizeStyle.pad, styles.outline]}>
            {renderContent()}
          </View>
        )}
        {variant === "ghost" && (
          <View style={[styles.base, sizeStyle.pad, styles.ghost]}>
            {renderContent()}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const SIZES = {
  sm: {
    pad: { paddingVertical: 10, paddingHorizontal: 16 },
    label: { fontSize: 13 },
    icon: { fontSize: 14, marginRight: 6 },
  },
  md: {
    pad: { paddingVertical: 14, paddingHorizontal: 20 },
    label: { fontSize: 15 },
    icon: { fontSize: 16, marginRight: 8 },
  },
  lg: {
    pad: { paddingVertical: 17, paddingHorizontal: 24 },
    label: { fontSize: 17 },
    icon: { fontSize: 18, marginRight: 8 },
  },
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    color: "#fff",
    ...FONTS.semiBold,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ghost: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
