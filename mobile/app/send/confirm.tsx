import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { AmountInput } from "@/components/AmountInput";
import { AssetPicker } from "@/components/AssetPicker";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { SuccessAnimation } from "@/components/ui/SuccessAnimation";
import { useTransaction } from "@/hooks/useTransaction";
import { buildAssetTransfer } from "@/lib/stellar/contracts";
import { SupportedAsset } from "@/lib/utils/constants";
import { colors, spacing, typography } from "@/lib/utils/theme";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";

export default function ConfirmSendScreen() {
  const [asset, setAsset] = useState<SupportedAsset>("USDC");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  const walletAddress = useAuthStore((s) => s.walletAddress);
  const balances = useWalletStore((s) => s.balances);
  const tx = useTransaction();

  const userBalance = balances.find((b) => b.asset === asset)?.amount ?? 0;
  const parsedAmount = Number(amount) || 0;
  const validTarget = isLikelyStellarAddress(to);
  const insufficient = parsedAmount > userBalance;

  useEffect(() => {
    if (tx.status === "success") {
      const id = setTimeout(() => router.back(), 1200);
      return () => clearTimeout(id);
    }
  }, [tx.status]);

  async function onSend() {
    if (!walletAddress) return;
    await tx.run(() => buildAssetTransfer({ from: walletAddress, to, asset, amount }));
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Send</Text>
      <AssetPicker value={asset} onChange={setAsset} />
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        label="To"
        placeholder="G… or C… address"
        value={to}
        onChangeText={setTo}
      />
      {to.length > 0 && !validTarget && (
        <Text style={styles.error}>That doesn't look like a Stellar address.</Text>
      )}
      <AmountInput
        asset={asset}
        value={amount}
        onChange={setAmount}
        onMax={() => setAmount(String(userBalance))}
      />
      {insufficient && (
        <Text style={styles.error}>
          You only have {userBalance.toFixed(2)} {asset}.
        </Text>
      )}
      <Button
        title="Send with Face ID"
        disabled={!walletAddress || !validTarget || parsedAmount <= 0 || insufficient}
        onPress={onSend}
      />
      {tx.error && <Text style={styles.error}>{tx.error}</Text>}

      <LoadingOverlay
        visible={
          tx.status === "building" ||
          tx.status === "signing" ||
          tx.status === "submitting" ||
          tx.status === "confirming"
        }
        message={
          tx.status === "signing"
            ? "Face ID required"
            : tx.status === "submitting"
              ? "Submitting…"
              : tx.status === "confirming"
                ? "Confirming…"
                : "Preparing send…"
        }
      />
      <SuccessAnimation visible={tx.status === "success"} />
    </Screen>
  );
}

function isLikelyStellarAddress(value: string): boolean {
  return /^[GC][A-Z2-7]{55}$/.test(value);
}

const styles = StyleSheet.create({
  title: { ...typography.headlineLg, color: colors.text.primary, marginBottom: spacing.gapMd },
  error: { ...typography.bodyMd, color: colors.error },
});
