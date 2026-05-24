import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { formatApy, formatMoney } from "@/lib/utils/format";
import { colors, spacing, typography } from "@/lib/utils/theme";

type RateCardProps = {
  asset: string;
  apy: number;
  days: number;
  maturityLabel: string;
  exampleDeposit: number;
  onDeposit?: () => void;
};

export function RateCard({
  asset,
  apy,
  days,
  maturityLabel,
  exampleDeposit,
  onDeposit
}: RateCardProps) {
  const earned = exampleDeposit * (apy / 100) * (days / 365);

  return (
    <View style={styles.card}>
      <Text style={styles.rate}>{formatApy(apy)}</Text>
      <Text style={styles.meta}>
        {days} days · Matures {maturityLabel}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.example}>
          {formatMoney(exampleDeposit)} deposit → earn {formatMoney(earned)}
        </Text>
        <Button title="Deposit" variant="secondary" onPress={onDeposit} style={styles.button} />
      </View>
      <Text style={styles.asset}>{asset}</Text>
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
  rate: {
    ...typography.displayMd,
    color: colors.brand.primaryLight
  },
  meta: {
    ...typography.bodyMd,
    color: colors.text.secondary
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  example: {
    ...typography.bodyMd,
    color: colors.text.tertiary,
    flex: 1
  },
  button: {
    minWidth: 116
  },
  asset: {
    ...typography.caption,
    color: colors.text.tertiary,
    position: "absolute",
    right: spacing.cardPaddingLg,
    top: spacing.cardPaddingLg
  }
});
