import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { SuccessAnimation } from "@/components/ui/SuccessAnimation";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function MaturityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen contentStyle={styles.screen}>
      <SuccessAnimation label="Savings matured" />
      <Text style={styles.title}>You earned $17.50</Text>
      <Text style={styles.subtitle}>Position {id ?? "USDC"} is ready to claim.</Text>
      <Button title="Claim to Available" />
      <Button title="Re-deposit" variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.gapLg,
    justifyContent: "center"
  },
  title: {
    ...typography.displayMd,
    color: colors.text.primary,
    textAlign: "center"
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    textAlign: "center"
  }
});
