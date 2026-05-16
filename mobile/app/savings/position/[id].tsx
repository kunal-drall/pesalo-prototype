import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { CurrencyBadge } from "@/components/CurrencyBadge";
import { Screen } from "@/components/Screen";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function PositionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Fixed Savings</Text>
        <CurrencyBadge asset="USDC" />
      </View>
      <Text style={styles.amount}>$500.00</Text>
      <Text style={styles.rate}>at 7.2% APY</Text>
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.progressLabel}>52 days left</Text>
      </View>
      <View style={styles.grid}>
        <Stat label="Earned" value="$4.38" accent />
        <Stat label="Expected" value="$17.50" />
        <Stat label="Maturity" value="Sep 15, 2026" />
        <Stat label="Position" value={id ?? "active"} />
      </View>
      <Text style={styles.exit}>Exit Early</Text>
    </Screen>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary
  },
  amount: {
    ...typography.displayMd,
    color: colors.text.primary,
    marginTop: spacing.gapLg
  },
  rate: {
    ...typography.bodyLg,
    color: colors.brand.primaryLight
  },
  progressWrap: {
    gap: spacing.gapMd,
    marginVertical: spacing.gapLg
  },
  progressTrack: {
    backgroundColor: colors.bg.elevated,
    borderRadius: spacing.radiusFull,
    height: 12,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.brand.primary,
    borderRadius: spacing.radiusFull,
    height: 12,
    width: "58%"
  },
  progressLabel: {
    ...typography.bodyMd,
    color: colors.text.secondary
  },
  grid: {
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusXl,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden"
  },
  stat: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.subtle,
    borderWidth: 0.5,
    gap: spacing.gapTight,
    padding: spacing.cardPadding,
    width: "50%"
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.tertiary
  },
  statValue: {
    ...typography.bodyLg,
    color: colors.text.primary
  },
  statAccent: {
    color: colors.accent.gold
  },
  exit: {
    ...typography.bodyLg,
    color: colors.error,
    marginTop: spacing.gapSection,
    textAlign: "center"
  }
});
