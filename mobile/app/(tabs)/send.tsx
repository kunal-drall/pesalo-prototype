import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function SendScreen() {
  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.copy}>
        <Text style={styles.title}>Send</Text>
        <Text style={styles.subtitle}>Send USDC, EURC, or XLM from your Pesalo wallet.</Text>
      </View>
      <View style={styles.actions}>
        <Link href="/send/confirm" asChild>
          <Button title="Start Send" />
        </Link>
        <Link href="/send/receive" asChild>
          <Button title="Receive" variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "space-between",
    paddingBottom: 120
  },
  copy: {
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
  actions: {
    gap: spacing.gapMd
  }
});
