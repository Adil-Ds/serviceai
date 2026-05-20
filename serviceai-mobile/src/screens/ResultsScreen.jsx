import React from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FONTS, RADIUS } from "../constants/theme";

function ScoreBar({ score }) {
  return (
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${score}%` }]} />
    </View>
  );
}

function ProviderCard({ item, onSelect }) {
  const p = item.provider;
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.rankBadge, { backgroundColor: rankColors[item.rank - 1] + "22" }]}>
          <Text style={[styles.rankText, { color: rankColors[item.rank - 1] }]}>
            #{item.rank}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.providerName}>{p.name}</Text>
          <Text style={styles.providerArea}>📍 {p.area}, {p.city}</Text>
        </View>
        {p.verified && <Text style={styles.verified}>✅ Verified</Text>}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>⭐ {p.rating}</Text>
          <Text style={styles.statLabel}>{p.review_count} reviews</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>📍 {item.distance_km}km</Text>
          <Text style={styles.statLabel}>away</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>₨{p.price_min.toLocaleString()}</Text>
          <Text style={styles.statLabel}>starting</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>Match Score</Text>
        <Text style={styles.scoreVal}>{item.score}/100</Text>
      </View>
      <ScoreBar score={item.score} />

      <View style={styles.reasonBox}>
        <Text style={styles.reasonText}>🤖 "{item.reason}"</Text>
      </View>

      <TouchableOpacity style={styles.selectBtn} onPress={() => onSelect(item)}>
        <Text style={styles.selectBtnText}>Book This Provider →</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ResultsScreen({ route, navigation }) {
  const { ranked, intent } = route.params;

  const handleSelect = (item) => {
    navigation.navigate("Booking", { provider: item, intent });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🏆 Top Matches</Text>
        <Text style={styles.sub}>
          {ranked.length} provider{ranked.length !== 1 ? "s" : ""} · {intent?.area}, {intent?.city}
        </Text>

        {ranked.map((item) => (
          <ProviderCard key={item.provider.id} item={item} onSelect={handleSelect} />
        ))}

        <Text style={styles.footer}>
          Ranked by: Distance (35%) · Rating (35%) · Price (20%) · Reviews (10%)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  rankBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  rankText: { fontSize: 14, ...FONTS.bold },
  providerName: { fontSize: 15, ...FONTS.semiBold, color: COLORS.text },
  providerArea: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  verified: { fontSize: 11, color: COLORS.success },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  stat: { alignItems: "center" },
  statVal: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  scoreLabel: { fontSize: 12, color: COLORS.textSecondary },
  scoreVal: { fontSize: 12, ...FONTS.semiBold, color: COLORS.primary },
  barBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 12 },
  barFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  reasonBox: {
    backgroundColor: COLORS.bg, borderRadius: RADIUS.sm,
    padding: 10, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  reasonText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: "italic", lineHeight: 18 },
  selectBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 12, alignItems: "center",
  },
  selectBtnText: { color: "#fff", fontSize: 14, ...FONTS.semiBold },
  footer: { fontSize: 11, color: COLORS.textMuted, textAlign: "center", marginTop: 8 },
});
