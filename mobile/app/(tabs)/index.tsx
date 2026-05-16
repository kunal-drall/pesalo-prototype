import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BalanceDisplay } from "@/components/BalanceDisplay";
import { SavingsCard } from "@/components/SavingsCard";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { colors, spacing, typography } from "@/lib/utils/theme";

const assets = [
  { name: "USD Coin", symbol: "USDC", amount: "500.00 USDC", usd: "$500.00" },
  { name: "Euro Coin", symbol: "EURC", amount: "250.00 EURC", usd: "$270.00" },
  { name: "Stellar", symbol: "XLM", amount: "1,000.00 XLM", usd: "$112.50" }
];

export default function HomeScreen() {
  return (
    <Screen scroll>
      <BalanceDisplay totalUsd={882.5} changeToday={2.34} />
      <View style={styles.quickActions}>
        <Link href="/savings/deposit-flex" asChild>
          <Button title="+ Deposit" variant="secondary" style={styles.quickButton} />
        </Link>
        <Link href="/send/confirm" asChild>
          <Button title="↗ Send" variant="secondary" style={styles.quickButton} />
        </Link>
      </View>
      <View>
        {assets.map((asset, index) => (
          <Pressable key={asset.symbol} style={[styles.assetRow, index > 0 && styles.separator]}>
            <View style={styles.token}>
              <Text style={styles.tokenText}>{asset.symbol.slice(0, 1)}</Text>
            </View>
            <View style={styles.assetCopy}>
              <Text style={styles.assetName}>{asset.name}</Text>
              <Text style={styles.assetSymbol}>{asset.symbol}</Text>
            </View>
            <View style={styles.assetAmounts}>
              <Text style={styles.assetAmount}>{asset.amount}</Text>
              <Text style={styles.assetUsd}>{asset.usd}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Savings</Text>
        <Link href="/(tabs)/savings" style={styles.sectionLink}>
          See all
        </Link>
      </View>
      <SavingsCard type="fixed" asset="USDC" amount={500} apy={7.2} earned={4.38} progress={0.58} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: "row",
    gap: spacing.gapMd,
    marginTop: -4
  },
  quickButton: {
    flex: 1
  },
  assetRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 72
  },
  separator: {
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1
  },
  token: {
    alignItems: "center",
    backgroundColor: colors.bg.tertiary,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  tokenText: {
    color: colors.brand.primaryLight,
    fontWeight: "700"
  },
  assetCopy: {
    flex: 1,
    marginLeft: 12
  },
  assetName: {
    ...typography.bodyLg,
    color: colors.text.primary
  },
  assetSymbol: {
    ...typography.bodyMd,
    color: colors.text.tertiary
  },
  assetAmounts: {
    alignItems: "flex-end"
  },
  assetAmount: {
    ...typography.money,
    color: colors.text.primary
  },
  assetUsd: {
    ...typography.bodyMd,
    color: colors.text.secondary
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.gapMd
  },
  sectionTitle: {
    ...typography.headlineLg,
    color: colors.text.primary
  },
  sectionLink: {
    ...typography.bodyMd,
    color: colors.brand.primary
  }
});
