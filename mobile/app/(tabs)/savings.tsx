import { Link, router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { RateCard } from "@/components/RateCard";
import { SavingsCard } from "@/components/SavingsCard";
import { Screen } from "@/components/Screen";
import { useRates } from "@/hooks/useRates";
import { colors, spacing, typography } from "@/lib/utils/theme";
import { useWalletStore } from "@/stores/walletStore";

export default function SavingsScreen() {
  const positions = useWalletStore((s) => s.positions);
  const { fixed, loading } = useRates();
  const topRate = fixed[0];

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Savings</Text>
        <Text style={styles.subtitle}>Choose a fixed rate or stay flexible.</Text>
      </View>

      {positions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No savings yet</Text>
          <Text style={styles.emptyBody}>
            Lock in a fixed rate or start a flexible deposit to begin earning.
          </Text>
        </View>
      ) : (
        positions.map((p) => (
          <SavingsCard
            key={p.id}
            type={p.type}
            asset={p.asset}
            amount={p.amount}
            apy={p.apy}
            earned={p.earned}
            progress={0}
          />
        ))
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Available rates</Text>
        <Link href="/savings/fixed-rates" style={styles.link}>
          View all
        </Link>
      </View>

      {loading && <ActivityIndicator color={colors.brand.primary} />}

      {topRate && (
        <RateCard
          asset={topRate.asset}
          apy={topRate.apy}
          days={topRate.days}
          maturityLabel={new Date(topRate.maturity).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
          exampleDeposit={500}
          onDeposit={() =>
            router.push({
              pathname: "/savings/deposit-fixed",
              params: { asset: topRate.asset, market: topRate.market, apy: String(topRate.apy) },
            })
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.gapTight },
  title: { ...typography.headlineLg, color: colors.text.primary },
  subtitle: { ...typography.bodyMd, color: colors.text.secondary },
  empty: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusXl,
    borderWidth: 1,
    gap: spacing.gapTight,
    padding: spacing.cardPaddingLg,
  },
  emptyTitle: { ...typography.headlineMd, color: colors.text.primary },
  emptyBody: { ...typography.bodyMd, color: colors.text.secondary },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.gapLg,
  },
  sectionLabel: { ...typography.caption, color: colors.text.tertiary },
  link: { ...typography.bodyMd, color: colors.brand.primary },
});
