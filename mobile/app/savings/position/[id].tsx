import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CurrencyBadge } from "@/components/CurrencyBadge";
import { Screen } from "@/components/Screen";
import { formatMoney } from "@/lib/utils/format";
import { colors, spacing, typography } from "@/lib/utils/theme";
import { useWalletStore } from "@/stores/walletStore";

export default function PositionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const positions = useWalletStore((s) => s.positions);
  const position = useMemo(() => positions.find((p) => p.id === id), [positions, id]);

  if (!position) {
    return (
      <Screen>
        <Text style={styles.title}>Position not found</Text>
        <Text style={styles.body}>This deposit may have already matured or been redeemed.</Text>
      </Screen>
    );
  }

  const progress = position.daysRemaining ? Math.max(0, Math.min(1, (90 - position.daysRemaining) / 90)) : 0;
  const expected = position.amount * (position.apy / 100) * ((position.daysRemaining ?? 0) / 365);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>
          {position.type === "fixed" ? "Fixed Savings" : "Flex Savings"}
        </Text>
        <CurrencyBadge asset={position.asset} />
      </View>
      <Text style={styles.amount}>{formatMoney(position.amount)}</Text>
      <Text style={styles.rate}>at {position.apy.toFixed(2)}% APY</Text>

      {position.type === "fixed" && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {position.daysRemaining ?? 0} days left
          </Text>
        </View>
      )}

      <View style={styles.grid}>
        <Stat label="Earned" value={formatMoney(position.earned)} accent />
        {position.type === "fixed" && (
          <Stat label="Expected" value={formatMoney(expected + position.earned)} />
        )}
        {position.maturity && (
          <Stat
            label="Maturity"
            value={new Date(position.maturity).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
        )}
        <Stat label="Position" value={position.id} />
      </View>
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
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { ...typography.headlineMd, color: colors.text.primary },
  body: { ...typography.bodyMd, color: colors.text.secondary },
  amount: { ...typography.displayMd, color: colors.text.primary, marginTop: spacing.gapLg },
  rate: { ...typography.bodyLg, color: colors.brand.primaryLight },
  progressWrap: { gap: spacing.gapMd, marginVertical: spacing.gapLg },
  progressTrack: {
    backgroundColor: colors.bg.elevated,
    borderRadius: spacing.radiusFull,
    height: 12,
    overflow: "hidden",
  },
  progressFill: { backgroundColor: colors.brand.primary, borderRadius: spacing.radiusFull, height: 12 },
  progressLabel: { ...typography.bodyMd, color: colors.text.secondary },
  grid: {
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusXl,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
  },
  stat: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.subtle,
    borderWidth: 0.5,
    gap: spacing.gapTight,
    padding: spacing.cardPadding,
    width: "50%",
  },
  statLabel: { ...typography.caption, color: colors.text.tertiary },
  statValue: { ...typography.bodyLg, color: colors.text.primary },
  statAccent: { color: colors.accent.gold },
});
