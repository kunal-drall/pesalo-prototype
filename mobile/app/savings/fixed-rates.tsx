import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { RateCard } from "@/components/RateCard";
import { Screen } from "@/components/Screen";
import { useRates } from "@/hooks/useRates";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function FixedRatesScreen() {
  const { fixed, loading, error } = useRates();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Fixed Savings</Text>
        <Text style={styles.subtitle}>Lock in your rate. Know exactly what you'll earn.</Text>
      </View>

      {loading && <ActivityIndicator color={colors.brand.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {fixed.map((rate) => {
        const maturityLabel = new Date(rate.maturity).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
        return (
          <View key={`${rate.asset}-${rate.maturity}`}>
            <Text style={styles.assetLabel}>{rate.asset}</Text>
            <RateCard
              asset={rate.asset}
              apy={rate.apy}
              days={rate.days}
              exampleDeposit={500}
              maturityLabel={maturityLabel}
              onDeposit={() =>
                router.push({
                  pathname: "/savings/deposit-fixed",
                  params: { asset: rate.asset, market: rate.market, apy: String(rate.apy) },
                })
              }
            />
          </View>
        );
      })}

      {!loading && fixed.length === 0 && !error && (
        <Text style={styles.empty}>
          No fixed-rate markets are open right now. Check back in a few minutes.
        </Text>
      )}

      <Text style={styles.disclaimer}>
        Rates reflect the current AMM price and may move before your deposit lands on chain.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.gapTight },
  title: { ...typography.headlineLg, color: colors.text.primary },
  subtitle: { ...typography.bodyMd, color: colors.text.secondary },
  assetLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.gapMd,
    marginBottom: spacing.gapTight,
  },
  empty: { ...typography.bodyMd, color: colors.text.secondary },
  error: { ...typography.bodyMd, color: colors.error },
  disclaimer: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.gapLg,
    textTransform: "none",
  },
});
