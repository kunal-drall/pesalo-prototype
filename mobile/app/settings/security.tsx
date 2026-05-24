import { StyleSheet, Text } from "react-native";

import { Screen } from "@/components/Screen";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function SecurityScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Security</Text>
      <Text style={styles.copy}>Pesalo uses your device passkey to protect your wallet. No seed phrase is shown or stored.</Text>
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
