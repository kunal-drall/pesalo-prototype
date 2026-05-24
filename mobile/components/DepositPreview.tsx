import { StyleSheet, Text, View } from "react-native";

import { formatApy, formatMoney } from "@/lib/utils/format";
import { colors, spacing, typography } from "@/lib/utils/theme";

type DepositPreviewProps = {
  amount: number;
  asset: string;
  apy: number;
  days: number;
  maturityLabel: string;
};

export function DepositPreview({
  amount,
  asset,
  apy,
  days,
  maturityLabel
}: DepositPreviewProps) {
  const earned = amount * (apy / 100) * (days / 365);

  return (
    <View style={styles.card}>
      <Text style={styles.amount}>{formatMoney(amount)}</Text>
      <Text style={styles.asset}>{asset}</Text>
      <View style={styles.divider} />
      <PreviewRow label="Fixed rate" value={formatApy(apy)} accent />
      <PreviewRow label="Term" value={`${days} days`} />
      <PreviewRow label="Matures" value={maturityLabel} />
      <PreviewRow label="You'll earn" value={formatMoney(earned)} gold />
      <PreviewRow label="Total at maturity" value={formatMoney(amount + earned)} strong />
    </View>
  );
}

function PreviewRow({
  label,
  value,
  accent = false,
  gold = false,
  strong = false
}: {
  label: string;
  value: string;
  accent?: boolean;
  gold?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          accent && styles.accent,
          gold && styles.gold,
          strong && styles.strong
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusXl,
    borderWidth: 1,
    gap: spacing.gapMd,
    padding: spacing.cardPaddingLg
  },
  amount: {
    ...typography.displayLg,
    color: colors.text.primary,
    fontVariant: ["tabular-nums"],
    textAlign: "center"
  },
  asset: {
    ...typography.headlineMd,
    color: colors.text.secondary,
    textAlign: "center"
  },
  divider: {
    borderColor: colors.border.medium,
    borderStyle: "dashed",
    borderTopWidth: 1,
    marginVertical: spacing.gapMd
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    ...typography.bodyLg,
    color: colors.text.secondary
  },
  value: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontVariant: ["tabular-nums"]
  },
  accent: {
    color: colors.brand.primaryLight
  },
  gold: {
    color: colors.accent.gold
  },
  strong: {
    ...typography.moneyLg,
    color: colors.text.primary
  }
});
