import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { QRCode } from "@/components/QRCode";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { colors, spacing, typography } from "@/lib/utils/theme";
import { useAuthStore } from "@/stores/authStore";

export default function ReceiveScreen() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!walletAddress) {
    return (
      <Screen>
        <Text style={styles.title}>Receive</Text>
        <Text style={styles.address}>Sign in before sharing your address.</Text>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <Text style={styles.title}>Receive</Text>
      <QRCode value={walletAddress} />
      <Text style={styles.address} selectable>
        {walletAddress}
      </Text>
      <Button title={copied ? "Copied!" : "Copy Address"} variant="secondary" onPress={copy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: "stretch", gap: spacing.gapXl },
  title: { ...typography.headlineLg, color: colors.text.primary },
  address: { ...typography.bodyMd, color: colors.text.secondary, textAlign: "center" },
});
