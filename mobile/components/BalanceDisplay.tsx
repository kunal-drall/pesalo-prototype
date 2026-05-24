import { StyleSheet, Text, View } from "react-native";

import { formatMoney } from "@/lib/utils/format";
import { colors, typography } from "@/lib/utils/theme";

type BalanceDisplayProps = {
  totalUsd: number;
  changeToday?: number;
};

export function BalanceDisplay({ totalUsd, changeToday = 0 }: BalanceDisplayProps) {
  const positive = changeToday >= 0;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Total Balance</Text>
      <Text style={styles.amount}>{formatMoney(totalUsd)}</Text>
      <Text style={[styles.change, positive ? styles.positive : styles.negative]}>
        {positive ? "+" : ""}
        {formatMoney(changeToday)} today
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4
  },
  label: {
    ...typography.caption,
    color: colors.text.tertiary
  },
  amount: {
    ...typography.displayLg,
    color: colors.text.primary,
    fontVariant: ["tabular-nums"]
  },
  change: {
    ...typography.bodyMd
  },
  positive: {
    color: colors.success
  },
  negative: {
    color: colors.error
  }
});
