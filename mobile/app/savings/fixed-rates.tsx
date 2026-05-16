import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { RateCard } from "@/components/RateCard";
import { Screen } from "@/components/Screen";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function FixedRatesScreen() {
  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Fixed Savings</Text>
        <Text style={styles.subtitle}>Lock in your rate. Know exactly what you'll earn.</Text>
      </View>
      <Text style={styles.assetLabel}>USDC</Text>
      <RateCard
        asset="USDC"
        apy={7.2}
        days={90}
        exampleDeposit={500}
        maturityLabel="Sep 15"
        onDeposit={() => router.push("/savings/deposit-fixed")}
      />
      <Text style={styles.assetLabel}>EURC</Text>
      <RateCard
        asset="EURC"
        apy={5.8}
        days={90}
        exampleDeposit={500}
        maturityLabel="Sep 15"
        onDeposit={() => router.push("/savings/deposit-fixed")}
      />
      <Text style={styles.disclaimer}>Rates are determined by market conditions and may change before deposit.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.gapTight
  },
  title: {
    ...typography.headlineLg,
    color: colors.text.primary
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary
  },
  assetLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.gapMd
  },
  disclaimer: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.gapLg,
    textTransform: "none"
  }
});
