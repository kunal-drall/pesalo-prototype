import { StyleSheet, Text } from "react-native";

import { Screen } from "@/components/Screen";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function AboutScreen() {
  return (
    <Screen>
      <Text style={styles.title}>About Pesalo</Text>
      <Text style={styles.copy}>Pesalo helps you save in USDC, EURC, and XLM with passkey-only access.</Text>
      <Text style={styles.copy}>hello@pesalo.fun</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.headlineLg,
    color: colors.text.primary
  },
  copy: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    marginTop: spacing.gapMd
  }
});
