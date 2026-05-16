import { StyleSheet, Text, View } from "react-native";

import { formatMoney } from "@/lib/utils/format";
import { colors, typography } from "@/lib/utils/theme";

type TransactionRowProps = {
  title: string;
  subtitle: string;
  amount: number;
  asset: string;
};

export function TransactionRow({ title, subtitle, amount, asset }: TransactionRowProps) {
  const positive = amount >= 0;

  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>{positive ? "+" : "−"}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.amounts}>
        <Text style={[styles.amount, positive ? styles.positive : styles.negative]}>
          {positive ? "+" : ""}
          {amount.toFixed(2)} {asset}
        </Text>
        <Text style={styles.usd}>{formatMoney(Math.abs(amount))}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 72
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.bg.tertiary,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  iconText: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: "700"
  },
  copy: {
    flex: 1,
    marginLeft: 12
  },
  title: {
    ...typography.bodyLg,
    color: colors.text.primary
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.tertiary
  },
  amounts: {
    alignItems: "flex-end"
  },
  amount: {
    ...typography.money,
    color: colors.text.primary
  },
  positive: {
    color: colors.success
  },
  negative: {
    color: colors.error
  },
  usd: {
    ...typography.bodyMd,
    color: colors.text.secondary
  }
});
