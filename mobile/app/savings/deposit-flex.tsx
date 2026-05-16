import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { AmountInput } from "@/components/AmountInput";
import { AssetPicker } from "@/components/AssetPicker";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { SuccessAnimation } from "@/components/ui/SuccessAnimation";
import { useRates } from "@/hooks/useRates";
import { useTransaction } from "@/hooks/useTransaction";
import { buildFlexDeposit } from "@/lib/stellar/contracts";
import { SupportedAsset } from "@/lib/utils/constants";
import { colors, spacing, typography } from "@/lib/utils/theme";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";

export default function DepositFlexScreen() {
  const [asset, setAsset] = useState<SupportedAsset>("USDC");
  const [amount, setAmount] = useState("");

  const walletAddress = useAuthStore((s) => s.walletAddress);
  const balances = useWalletStore((s) => s.balances);
  const { flex } = useRates();
  const tx = useTransaction();

  const rate = flex.find((r) => r.asset === asset);
  const userBalance = balances.find((b) => b.asset === asset)?.amount ?? 0;
  const parsedAmount = Number(amount) || 0;
  const insufficient = parsedAmount > userBalance;

  useEffect(() => {
    if (tx.status === "success") {
      const id = setTimeout(() => router.back(), 1400);
      return () => clearTimeout(id);
    }
  }, [tx.status]);

  async function onSubmit() {
    if (!walletAddress) return;
    await tx.run(() => buildFlexDeposit({ user: walletAddress, asset, amount }));
  }

  return (
    <Screen contentStyle={styles.screen}>
      <Text style={styles.title}>Flex Savings</Text>
      <Text style={styles.subtitle}>
        Deposit any time, withdraw when you need it.
        {rate ? ` Earning roughly ${rate.apy.toFixed(1)}% APY today.` : ""}
      </Text>
      <AssetPicker value={asset} onChange={setAsset} />
      <AmountInput
        asset={asset}
        value={amount}
        onChange={setAmount}
        onMax={() => setAmount(String(userBalance))}
      />
      {insufficient && (
        <Text style={styles.error}>
          You only have {userBalance.toFixed(2)} {asset} available.
        </Text>
      )}
      <Button
        title="Deposit with Face ID"
        disabled={!walletAddress || parsedAmount <= 0 || insufficient}
        onPress={onSubmit}
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
                : "Preparing deposit…"
        }
      />
      <SuccessAnimation visible={tx.status === "success"} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.gapLg },
  title: { ...typography.headlineLg, color: colors.text.primary },
  subtitle: { ...typography.bodyMd, color: colors.text.secondary, marginTop: -spacing.gapMd },
  error: { ...typography.bodyMd, color: colors.error },
});
