import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/Screen";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function WelcomeScreen() {
  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <View style={styles.seed} />
        </View>
        <Text style={styles.title}>Pesalo</Text>
        <Text style={styles.subtitle}>Save smarter.</Text>
      </View>
      <View style={styles.actions}>
        <Link href="/(auth)/create" asChild>
          <Button title="Create Account" />
        </Link>
        <Link href="/(tabs)" asChild>
          <Button title="I already have an account" variant="tertiary" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "space-between",
    paddingBottom: 40
  },
  brand: {
    alignItems: "center",
    gap: spacing.gapMd,
    marginTop: "28%"
  },
  mark: {
    alignItems: "center",
    backgroundColor: colors.brand.primaryMuted,
    borderColor: colors.brand.primary,
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  seed: {
    backgroundColor: colors.brand.primaryLight,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 18,
    height: 30,
    transform: [{ rotate: "-35deg" }],
    width: 22
  },
  title: {
    ...typography.displayMd,
    color: colors.text.primary
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.text.secondary
  },
  actions: {
    gap: spacing.gapMd
  }
});
