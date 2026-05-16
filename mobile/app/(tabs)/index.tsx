import { Link } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { BalanceDisplay } from "@/components/BalanceDisplay";
import { SavingsCard } from "@/components/SavingsCard";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { formatAssetAmount, formatMoney } from "@/lib/utils/format";
import { SupportedAsset } from "@/lib/utils/constants";
import { colors, spacing, typography } from "@/lib/utils/theme";
import { useWalletStore } from "@/stores/walletStore";

const ASSET_LABELS: Record<SupportedAsset, string> = {
  USDC: "USD Coin",
  EURC: "Euro Coin",
  XLM: "Stellar",
};

export default function HomeScreen() {
  const {
    balances,
    positions,
    totalUsd,
    isLoading,
    isStale,
    error,
    lastUpdated,
    refresh,
    address,
  } = useWalletStore();

  useEffect(() => {
    if (address) {
      refresh().catch(() => {});
    }
  }, [address, refresh]);

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          tintColor={colors.brand.primary}
          refreshing={isLoading}
          onRefresh={refresh}
        />
      }
    >
      <BalanceDisplay totalUsd={totalUsd} changeToday={0} />

      {isStale && (
        <Text style={styles.stale}>
          Showing cached data{lastUpdated ? ` from ${new Date(lastUpdated).toLocaleTimeString()}` : ""}.
        </Text>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.quickActions}>
        <Link href="/savings/deposit-flex" asChild>
          <Button title="+ Deposit" variant="secondary" style={styles.quickButton} />
        </Link>
        <Link href="/send/confirm" asChild>
          <Button title="↗ Send" variant="secondary" style={styles.quickButton} />
        </Link>
      </View>

      <View>
        {balances.map((balance, index) => (
          <Pressable
            key={balance.asset}
            style={[styles.assetRow, index > 0 && styles.separator]}
          >
            <View style={styles.token}>
              <Text style={styles.tokenText}>{balance.asset.slice(0, 1)}</Text>
            </View>
            <View style={styles.assetCopy}>
              <Text style={styles.assetName}>{ASSET_LABELS[balance.asset]}</Text>
              <Text style={styles.assetSymbol}>{balance.asset}</Text>
            </View>
            <View style={styles.assetAmounts}>
              <Text style={styles.assetAmount}>
                {formatAssetAmount(balance.amount, balance.asset)}
              </Text>
              <Text style={styles.assetUsd}>{formatMoney(balance.usdValue)}</Text>
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

      {positions.length === 0 && !isLoading && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Start earning</Text>
          <Text style={styles.emptyBody}>
            Lock in a fixed rate on your USDC or EURC. Available the moment your deposit
            confirms.
          </Text>
          <Link href="/savings/fixed-rates" asChild>
            <Button title="Browse rates" />
          </Link>
        </View>
      )}

      {positions.map((p) => (
        <SavingsCard
          key={p.id}
          type={p.type}
          asset={p.asset}
          amount={p.amount}
          apy={p.apy}
          earned={p.earned}
          progress={progressForPosition(p)}
        />
      ))}

      {isLoading && positions.length === 0 && (
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.gapLg }} />
      )}
    </Screen>
  );
}

function progressForPosition(p: {
  type: "fixed" | "flex";
  daysRemaining?: number;
  maturity?: string;
}): number {
  if (p.type !== "fixed" || !p.daysRemaining || !p.maturity) return 0;
  const total = Math.max(1, Math.ceil(p.daysRemaining));
  // We don't know term length here; backend should pass progress directly in
  // future. For now approximate using days remaining against a 90-day default.
  const term = 90;
  return Math.max(0, Math.min(1, (term - total) / term));
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: "row",
    gap: spacing.gapMd,
    marginTop: -4,
  },
  quickButton: { flex: 1 },
  stale: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
  },
  assetRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 72,
  },
  separator: {
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
  },
  token: {
    alignItems: "center",
    backgroundColor: colors.bg.tertiary,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  tokenText: {
    color: colors.brand.primaryLight,
    fontWeight: "700",
  },
  assetCopy: { flex: 1, marginLeft: 12 },
  assetName: { ...typography.bodyLg, color: colors.text.primary },
  assetSymbol: { ...typography.bodyMd, color: colors.text.tertiary },
  assetAmounts: { alignItems: "flex-end" },
  assetAmount: { ...typography.money, color: colors.text.primary },
  assetUsd: { ...typography.bodyMd, color: colors.text.secondary },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.gapMd,
  },
  sectionTitle: { ...typography.headlineLg, color: colors.text.primary },
  sectionLink: { ...typography.bodyMd, color: colors.brand.primary },
  empty: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusXl,
    borderWidth: 1,
    gap: spacing.gapMd,
    padding: spacing.cardPaddingLg,
  },
  emptyTitle: { ...typography.headlineLg, color: colors.text.primary },
  emptyBody: { ...typography.bodyMd, color: colors.text.secondary },
});
