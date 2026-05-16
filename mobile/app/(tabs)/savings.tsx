import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { RateCard } from "@/components/RateCard";
import { SavingsCard } from "@/components/SavingsCard";
import { Screen } from "@/components/Screen";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function SavingsScreen() {
  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Savings</Text>
        <Text style={styles.subtitle}>Choose a fixed rate or stay flexible.</Text>
      </View>
      <SavingsCard type="fixed" asset="USDC" amount={500} apy={7.2} earned={4.38} progress={0.58} />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Available rates</Text>
        <Link href="/savings/fixed-rates" style={styles.link}>
          View all
        </Link>
      </View>
      <RateCard asset="USDC" apy={7.2} days={90} maturityLabel="Sep 15" exampleDeposit={500} />
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
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.gapLg
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.text.tertiary
  },
  link: {
    ...typography.bodyMd,
    color: colors.brand.primary
  }
});
