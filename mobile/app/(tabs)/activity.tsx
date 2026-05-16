import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { TransactionRow } from "@/components/TransactionRow";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function ActivityScreen() {
  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Your recent deposits, sends, and earnings.</Text>
      </View>
      <TransactionRow title="Fixed deposit" subtitle="Today" amount={500} asset="USDC" />
      <TransactionRow title="Sent" subtitle="Yesterday" amount={-10} asset="USDC" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.gapTight,
    marginBottom: spacing.gapMd
  },
  title: {
    ...typography.headlineLg,
    color: colors.text.primary
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary
  }
});
