import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { AmountInput } from "@/components/AmountInput";
import { AssetPicker } from "@/components/AssetPicker";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { SupportedAsset } from "@/lib/utils/constants";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function DepositFlexScreen() {
  const [asset, setAsset] = useState<SupportedAsset>("USDC");
  const [amount, setAmount] = useState("100");

  return (
    <Screen contentStyle={styles.screen}>
      <Text style={styles.title}>Flex Savings</Text>
      <Text style={styles.subtitle}>Deposit any time and withdraw when you need it.</Text>
      <AssetPicker value={asset} onChange={setAsset} />
      <AmountInput asset={asset} value={amount} onChange={setAmount} onMax={() => setAmount("100")} />
      <Button title="Deposit with Face ID" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.gapLg
  },
  title: {
    ...typography.headlineLg,
    color: colors.text.primary
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginTop: -spacing.gapMd
  }
});
