import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { formatApy, formatMoney } from "@/lib/utils/format";
import { colors, spacing, typography } from "@/lib/utils/theme";

type SavingsCardProps = {
  type: "fixed" | "flex";
  asset: string;
  amount: number;
  apy: number;
  earned: number;
  progress?: number;
};

export function SavingsCard({
  type,
  asset,
  amount,
  apy,
  earned,
  progress = 0
}: SavingsCardProps) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.card}>
      <LinearGradient colors={["#16A36712", "transparent"]} style={styles.glow} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{type === "fixed" ? "Fixed Savings" : "Flex Savings"}</Text>
          <Text style={styles.asset}>{asset}</Text>
        </View>
        <Text style={styles.amount}>{formatMoney(amount)}</Text>
        <Text style={styles.meta}>
          {formatApy(apy)} · Earned {formatMoney(earned)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusXl,
    borderWidth: 1,
    overflow: "hidden"
  },
  glow: {
    height: 80,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  content: {
    gap: spacing.gapMd,
    padding: spacing.cardPaddingLg
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary
  },
  asset: {
    ...typography.caption,
    color: colors.text.secondary
  },
  amount: {
    ...typography.moneyLg,
    color: colors.text.primary
  },
  meta: {
    ...typography.bodyMd,
    color: colors.text.secondary
  },
  track: {
    backgroundColor: colors.bg.elevated,
    borderRadius: spacing.radiusFull,
    height: 6,
    overflow: "hidden"
  },
  fill: {
    backgroundColor: colors.brand.primary,
    borderRadius: spacing.radiusFull,
    height: 6
  }
});
