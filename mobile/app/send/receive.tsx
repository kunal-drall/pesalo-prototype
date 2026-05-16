import { StyleSheet, Text } from "react-native";

import { QRCode } from "@/components/QRCode";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { colors, spacing, typography } from "@/lib/utils/theme";

const address = "GCPESALOEXAMPLETESTNETADDRESS";

export default function ReceiveScreen() {
  return (
    <Screen contentStyle={styles.screen}>
      <Text style={styles.title}>Receive</Text>
      <QRCode value={address} />
      <Text style={styles.address}>{address}</Text>
      <Button title="Copy Address" variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "stretch",
    gap: spacing.gapXl
  },
  title: {
    ...typography.headlineLg,
    color: colors.text.primary
  },
  address: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: "center"
  }
});
