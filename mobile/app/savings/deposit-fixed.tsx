import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AmountInput } from "@/components/AmountInput";
import { AssetPicker } from "@/components/AssetPicker";
import { DepositPreview } from "@/components/DepositPreview";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { SupportedAsset } from "@/lib/utils/constants";
import { colors, spacing, typography } from "@/lib/utils/theme";

export default function DepositFixedScreen() {
  const [asset, setAsset] = useState<SupportedAsset>("USDC");
  const [amount, setAmount] = useState("500");
  const parsedAmount = Number(amount) || 0;

  return (
    <Screen scroll>
      <Text style={styles.title}>Confirm Deposit</Text>
      <AssetPicker value={asset} onChange={setAsset} />
      <AmountInput asset={asset} value={amount} onChange={setAmount} onMax={() => setAmount("500")} />
      <DepositPreview
        amount={parsedAmount}
        apy={asset === "EURC" ? 5.8 : 7.2}
        asset={asset}
        days={90}
        maturityLabel="Sep 15, 2026"
      />
      <View style={styles.info}>
        <MaterialCommunityIcons color={colors.text.secondary} name="lock-outline" size={18} />
        <Text style={styles.infoText}>Only you can access your savings with Face ID.</Text>
      </View>
      <Button title="Deposit with Face ID" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.headlineLg,
    color: colors.text.primary,
    textAlign: "center"
  },
  info: {
    alignItems: "center",
    backgroundColor: colors.bg.tertiary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.gapTight,
    padding: spacing.cardPadding
  },
  infoText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    flex: 1
  }
});
