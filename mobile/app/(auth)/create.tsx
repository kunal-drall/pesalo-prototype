import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function CreateAccountScreen() {
  const createAccount = useAuth((state) => state.createAccount);

  async function handleCreate() {
    await createAccount();
    router.replace("/(tabs)");
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.copy}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Use Face ID or your device passkey to protect your savings.</Text>
      </View>
      <Button title="Create with Face ID" onPress={handleCreate} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "space-between",
    paddingBottom: 40
  },
  copy: {
    gap: spacing.gapMd,
    marginTop: "30%"
  },
  title: {
    ...typography.displayMd,
    color: colors.text.primary
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.text.secondary
  }
});
