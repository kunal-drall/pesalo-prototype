import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { AmountInput } from "@/components/AmountInput";
import { AssetPicker } from "@/components/AssetPicker";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SupportedAsset } from "@/lib/utils/constants";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function ConfirmSendScreen() {
  const [asset, setAsset] = useState<SupportedAsset>("USDC");
  const [amount, setAmount] = useState("10");

  return (
    <Screen scroll>
      <Text style={styles.title}>Send</Text>
      <AssetPicker value={asset} onChange={setAsset} />
      <Input autoCapitalize="none" label="To" placeholder="Wallet address" />
      <AmountInput asset={asset} value={amount} onChange={setAmount} />
      <Input label="Memo" placeholder="Optional" />
      <Button title="Send with Face ID" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.headlineLg,
    color: colors.text.primary,
    marginBottom: spacing.gapMd
  }
});
