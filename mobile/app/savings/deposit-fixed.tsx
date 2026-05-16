import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AmountInput } from "@/components/AmountInput";
import { AssetPicker } from "@/components/AssetPicker";
import { DepositPreview } from "@/components/DepositPreview";
import { Screen } from "@/components/Screen";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { SuccessAnimation } from "@/components/ui/SuccessAnimation";
import { Button } from "@/components/ui/Button";
import { useRates } from "@/hooks/useRates";
import { useTransaction } from "@/hooks/useTransaction";
import { buildFixedDeposit } from "@/lib/stellar/contracts";
import { SupportedAsset } from "@/lib/utils/constants";
import { colors, spacing, typography } from "@/lib/utils/theme";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";

export default function DepositFixedScreen() {
  const params = useLocalSearchParams<{ asset?: SupportedAsset; market?: string; apy?: string }>();
  const initialAsset: SupportedAsset =
    params.asset === "EURC" || params.asset === "USDC" ? params.asset : "USDC";

  const [asset, setAsset] = useState<SupportedAsset>(initialAsset);
  const [amount, setAmount] = useState("");

  const { walletAddress } = useAuthStore();
  const balances = useWalletStore((s) => s.balances);
  const { fixed, loading: ratesLoading } = useRates();
  const tx = useTransaction();

  const rate = useMemo(
    () => fixed.find((r) => r.asset === asset) ?? null,
    [fixed, asset],
  );

  const userBalance = balances.find((b) => b.asset === asset)?.amount ?? 0;
  const parsedAmount = Number(amount) || 0;
  const insufficient = parsedAmount > userBalance;
  const apy = rate?.apy ?? Number(params.apy ?? "0");
  const days = rate?.days ?? 90;
  const maturity = rate?.maturity ?? "";

  useEffect(() => {
    if (tx.status === "success") {
      const id = setTimeout(() => router.back(), 1400);
      return () => clearTimeout(id);
    }
  }, [tx.status]);

  async function onSubmit() {
    if (!walletAddress) {
      return;
    }
    await tx.run(() =>
      buildFixedDeposit({
        user: walletAddress,
        asset,
        amount,
      }),
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Fixed Savings</Text>
      <AssetPicker
        value={asset}
        onChange={(next) => {
          if (next === "USDC" || next === "EURC") setAsset(next);
        }}
        options={["USDC", "EURC"]}
      />
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

      <DepositPreview
        amount={parsedAmount}
        apy={apy}
        asset={asset}
        days={days}
        maturityLabel={
          maturity
            ? new Date(maturity).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"
        }
      />

      <View style={styles.info}>
        <MaterialCommunityIcons color={colors.text.secondary} name="lock-outline" size={18} />
        <Text style={styles.infoText}>
          Only you can access your savings — every action is signed with Face ID.
        </Text>
      </View>

      <Button
        title={ratesLoading ? "Loading rates…" : "Deposit with Face ID"}
        disabled={
          ratesLoading ||
          !walletAddress ||
          parsedAmount <= 0 ||
          insufficient ||
          tx.status === "building" ||
          tx.status === "signing" ||
          tx.status === "submitting" ||
          tx.status === "confirming"
        }
        onPress={onSubmit}
      />

      {tx.error && <Text style={styles.error}>{tx.error}</Text>}

      <LoadingOverlay visible={isInProgress(tx.status)} message={messageFor(tx.status)} />
      <SuccessAnimation visible={tx.status === "success"} />
    </Screen>
  );
}

function isInProgress(status: string) {
  return status === "building" || status === "signing" || status === "submitting" || status === "confirming";
}

function messageFor(status: string) {
  switch (status) {
    case "building":
      return "Preparing deposit…";
    case "signing":
      return "Face ID required";
    case "submitting":
      return "Submitting to Stellar…";
    case "confirming":
      return "Confirming on chain…";
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  title: { ...typography.headlineLg, color: colors.text.primary, textAlign: "center" },
  info: {
    alignItems: "center",
    backgroundColor: colors.bg.tertiary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.gapTight,
    padding: spacing.cardPadding,
  },
  infoText: { ...typography.bodyMd, color: colors.text.secondary, flex: 1 },
  error: { ...typography.bodyMd, color: colors.error },
});
