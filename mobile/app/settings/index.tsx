import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function SettingsScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.list}>
        <Link href="/settings/security" style={styles.item}>
          Security
        </Link>
        <Link href="/settings/about" style={styles.item}>
          About Pesalo
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.headlineLg,
    color: colors.text.primary
  },
  list: {
    gap: spacing.gapMd
  },
  item: {
    ...typography.bodyLg,
    color: colors.text.primary,
    paddingVertical: 12
  }
});
