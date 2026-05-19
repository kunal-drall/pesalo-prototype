import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/design/Buttons";
import { Icon } from "@/components/design/Icon";
import { AssetIcon } from "@/components/design/Icon";
import { NavBar } from "@/components/design/NavBar";
import { Screen } from "@/components/design/Screen";
import { Caption, Money } from "@/components/design/Text";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useRates } from "@/hooks/useRates";
import { useTransaction } from "@/hooks/useTransaction";
import { useTheme } from "@/lib/design/theme";
import { buildBoost, toRawAmount } from "@/lib/stellar/contracts";
import { SupportedAsset } from "@/lib/utils/constants";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";

/// Confirm Boost — the deposit-fixed route doubles as the boost confirm
/// screen. The user lands here from a BoostRateCard with the asset and
/// market pre-selected; they type the amount, see the rate upgrade, and
/// commit via passkey. All numbers (auto-earn baseline, expected earn,
/// total at maturity) are derived from on-chain rates + the user's
/// actual balance.
export default function BoostConfirmScreen() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    asset?: string;
    market?: string;
    apy?: string;
  }>();
  const asset: SupportedAsset =
    params.asset === "USDC" || params.asset === "EURC" ? params.asset : "USDC";

  const { walletAddress } = useAuthStore();
  const balances = useWalletStore((s) => s.balances);
  const { fixed, flex, loading: ratesLoading } = useRates();
  const tx = useTransaction();

  const rate = useMemo(
    () => fixed.find((r) => r.asset === asset && r.market === params.market) ?? fixed.find((r) => r.asset === asset),
    [fixed, asset, params.market],
  );
  const autoEarn = flex.find((f) => f.asset === asset)?.apy ?? 0;
  const apy = rate?.apy ?? Number(params.apy ?? "0");
  const days = rate?.days ?? 0;
  const userBalance = balances.find((b) => b.asset === asset)?.amount ?? 0;

  const [amount, setAmount] = useState("");
  const parsed = Number(amount) || 0;
  const insufficient = parsed > userBalance;
  const earn = parsed * (apy / 100) * (days / 365);
  const total = parsed + earn;
  const maturityLabel = rate?.maturity
    ? new Date(rate.maturity).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  useEffect(() => {
    if (tx.status === "success") {
      const id = setTimeout(() => {
        router.replace({
          pathname: "/savings/maturity/success",
          params: { asset, amount: String(parsed), apy: String(apy) },
        });
      }, 600);
      return () => clearTimeout(id);
    }
  }, [tx.status, router, asset, parsed, apy]);

  async function onSubmit() {
    if (!walletAddress || parsed <= 0 || insufficient) return;
    await tx.run(() =>
      buildBoost({
        user: walletAddress,
        asset,
        syAmountRaw: toRawAmount(asset, parsed),
      }),
    );
  }

  const submitting = tx.status === "building" || tx.status === "signing" || tx.status === "submitting" || tx.status === "confirming";

  return (
    <Screen scrollable={false} topInset={0}>
      <NavBar
        title="Confirm Boost"
        onBack={() => router.back()}
        badge={asset}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1 }}>
          <View style={{ alignItems: "center", paddingTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                style={{
                  fontFamily: t.sans,
                  fontSize: 48,
                  fontWeight: "700",
                  color: t.fg,
                  letterSpacing: -2.2,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {asset === "EURC" ? "€" : "$"}
              </Text>
              <TextInput
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                placeholderTextColor={t.fg3}
                keyboardType="decimal-pad"
                style={{
                  fontFamily: t.sans,
                  fontSize: 48,
                  fontWeight: "700",
                  color: t.fg,
                  letterSpacing: -2.2,
                  minWidth: 140,
                }}
              />
            </View>
            <View style={{ height: 4 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AssetIcon symbol={asset} size={18} />
              <Text
                style={{
                  fontFamily: t.sans,
                  fontSize: 16,
                  fontWeight: "500",
                  color: t.fg2,
                  letterSpacing: -0.2,
                }}
              >
                {asset}
              </Text>
              <Pressable
                onPress={() => setAmount(String(userBalance))}
                hitSlop={6}
                style={{
                  marginLeft: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: t.bg2,
                }}
              >
                <Text
                  style={{
                    fontFamily: t.sans,
                    fontSize: 11,
                    fontWeight: "600",
                    color: t.fg2,
                    letterSpacing: 0.4,
                  }}
                >
                  MAX
                </Text>
              </Pressable>
            </View>
            {insufficient && (
              <Text
                style={{
                  fontFamily: t.sans,
                  color: t.error,
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                You only have {userBalance.toFixed(2)} {asset} available
              </Text>
            )}
          </View>

          <View style={{ height: 18 }} />

          {/* Rate upgrade card */}
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                backgroundColor: t.bg1,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <View style={{ flex: 1, alignItems: "center" }}>
                <Caption>From</Caption>
                <View style={{ height: 4 }} />
                <Money size={20} weight="600" color={t.fg2}>
                  {autoEarn.toFixed(1)}%
                </Money>
                <Text
                  style={{
                    fontFamily: t.sans,
                    fontSize: 11,
                    color: t.fg3,
                  }}
                >
                  auto-earn
                </Text>
              </View>
              <Icon name="arrow-up-right" size={18} stroke={2.2} color={t.gold} />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: t.sans,
                    fontSize: 11,
                    fontWeight: "700",
                    color: t.gold,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  To
                </Text>
                <View style={{ height: 4 }} />
                <Money size={20} weight="700" color={t.gold}>
                  {apy.toFixed(1)}%
                </Money>
                <Text
                  style={{
                    fontFamily: t.sans,
                    fontSize: 11,
                    color: t.fg3,
                  }}
                >
                  fixed
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 12 }} />

          <View style={{ paddingHorizontal: 20 }}>
            <DetailRow label="Term" value={`${days} days`} />
            <DetailRow label="Matures" value={maturityLabel} />
            <DetailRow
              label="You'll earn"
              value={parsed > 0 ? `+${formatAsset(earn, asset)}` : "—"}
              color={t.gold}
              weight="600"
            />
            <View style={{ borderTopWidth: 1, borderTopColor: t.border, marginVertical: 8 }} />
            <DetailRow
              label="Total at maturity"
              value={parsed > 0 ? formatAsset(total, asset) : "—"}
              size={20}
              weight="600"
            />
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                backgroundColor: t.bg2,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icon name="sparkles" size={16} stroke={1.8} color={t.green} />
              <Text
                style={{
                  fontFamily: t.sans,
                  fontSize: 13,
                  color: t.fg2,
                  flex: 1,
                  lineHeight: 18,
                  letterSpacing: -0.05,
                }}
              >
                Funds return to auto-earn at maturity. No dead period.
              </Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}>
            <PrimaryButton
              onPress={onSubmit}
              icon="face-id"
              disabled={
                ratesLoading ||
                !walletAddress ||
                parsed <= 0 ||
                insufficient ||
                submitting
              }
            >
              {submitting ? "Boosting…" : "Boost with Face ID"}
            </PrimaryButton>
            <View style={{ height: 10 }} />
            <Text
              style={{
                fontFamily: t.sans,
                textAlign: "center",
                fontSize: 12,
                color: t.fg3,
              }}
            >
              By boosting, you agree to the Terms.
            </Text>
            {tx.error && (
              <Text
                style={{
                  fontFamily: t.sans,
                  textAlign: "center",
                  fontSize: 12,
                  color: t.error,
                  marginTop: 8,
                }}
              >
                {tx.error}
              </Text>
            )}
            {ratesLoading && (
              <ActivityIndicator
                color={t.green}
                style={{ marginTop: 8 }}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      <LoadingOverlay
        visible={submitting}
        message={messageFor(tx.status)}
      />
    </Screen>
  );
}

function DetailRow({
  label,
  value,
  color,
  size = 15,
  weight = "500",
}: {
  label: string;
  value: string;
  color?: string;
  size?: number;
  weight?: "400" | "500" | "600" | "700";
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        paddingVertical: 12,
      }}
    >
      <Text
        style={{
          fontFamily: t.sans,
          fontSize: 15,
          color: t.fg2,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
      <Money size={size} weight={weight} color={color}>
        {value}
      </Money>
    </View>
  );
}

function formatAsset(amount: number, asset: SupportedAsset) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ${asset}`;
}

function messageFor(status: string) {
  switch (status) {
    case "building":
      return "Preparing boost…";
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
