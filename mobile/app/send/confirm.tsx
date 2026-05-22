import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/design/Buttons";
import { Icon } from "@/components/design/Icon";
import { NavBar } from "@/components/design/NavBar";
import { Screen } from "@/components/design/Screen";
import { Caption, Money } from "@/components/design/Text";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useTheme } from "@/lib/design/theme";
import { useTransaction } from "@/hooks/useTransaction";
import { buildClassicPayment } from "@/lib/stellar/payments";
import { SupportedAsset, SUPPORTED_ASSETS } from "@/lib/utils/constants";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";

/// Send — pick asset, type amount, paste recipient. Submits a classic
/// Stellar payment over Horizon, signed with the on-device key. Works
/// for both the dev keypair and any future passkey smart-wallet whose
/// underlying asset is held outside Soroban.
export default function SendScreen() {
  const t = useTheme();
  const router = useRouter();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const balances = useWalletStore((s) => s.balances) ?? [];
  const tx = useTransaction();

  const [asset, setAsset] = useState<SupportedAsset>("XLM");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const userBalance = balances.find((b) => b.asset === asset)?.amount ?? 0;
  const parsed = Number(amount) || 0;
  const validTarget = isLikelyStellarAddress(recipient.trim());
  const insufficient = parsed > userBalance;
  const symbol = asset === "USDC" ? "$" : asset === "EURC" ? "€" : "";

  useEffect(() => {
    if (tx.status === "success") {
      const id = setTimeout(() => router.replace("/(tabs)"), 1200);
      return () => clearTimeout(id);
    }
  }, [tx.status, router]);

  async function onSend() {
    if (!walletAddress || !validTarget || parsed <= 0 || insufficient) return;
    await tx.runClassic(() =>
      buildClassicPayment({
        from: walletAddress,
        to: recipient.trim(),
        asset,
        amount,
      }),
    );
  }

  const submitting =
    tx.status === "building" ||
    tx.status === "signing" ||
    tx.status === "submitting" ||
    tx.status === "confirming";

  return (
    <Screen scrollable={false} topInset={0}>
      <NavBar title="Send" onClose={() => router.back()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1 }}>
          {/* Asset segment */}
          <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
            <View
              style={{
                flexDirection: "row",
                gap: 4,
                padding: 4,
                backgroundColor: t.bg1,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 14,
              }}
            >
              {SUPPORTED_ASSETS.map((o) => {
                const on = o === asset;
                return (
                  <Pressable
                    key={o}
                    onPress={() => setAsset(o)}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: on ? t.green : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: on ? t.green : "transparent",
                      shadowOpacity: on ? 0.4 : 0,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: t.sans,
                        fontSize: 14,
                        fontWeight: "600",
                        color: on ? "#fff" : t.fg2,
                        letterSpacing: -0.1,
                      }}
                    >
                      {o}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Amount */}
          <View style={{ paddingHorizontal: 20, paddingTop: 36, alignItems: "center", position: "relative" }}>
            <Caption>Amount</Caption>
            <View style={{ height: 14 }} />
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              {symbol ? (
                <Text
                  style={{
                    fontFamily: t.sans,
                    fontSize: 32,
                    fontWeight: "500",
                    color: t.fg3,
                    letterSpacing: -1,
                  }}
                >
                  {symbol}
                </Text>
              ) : null}
              <TextInput
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                placeholder="0"
                placeholderTextColor={t.fg3}
                keyboardType="decimal-pad"
                style={{
                  fontFamily: t.sans,
                  fontSize: 56,
                  fontWeight: "700",
                  color: t.fg,
                  letterSpacing: -2.5,
                  minWidth: 120,
                  textAlign: "center",
                }}
              />
            </View>
            <View style={{ height: 8 }} />
            <Money size={14} weight="400" color={t.fg2}>
              {parsed > 0 ? `${parsed.toFixed(2)} ${asset}` : `0.00 ${asset}`}
            </Money>
            <Pressable
              onPress={() => setAmount(String(userBalance))}
              style={({ pressed }) => ({
                position: "absolute",
                top: 28,
                right: 20,
                height: 28,
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: "rgba(22,163,103,0.15)",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: t.sans,
                  fontSize: 12,
                  fontWeight: "700",
                  color: t.green,
                  letterSpacing: 0.4,
                }}
              >
                MAX
              </Text>
            </Pressable>
          </View>

          {/* Auto-withdraw hint */}
          <View style={{ paddingTop: 12, alignItems: "center" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: t.bg1,
                borderWidth: 1,
                borderColor: t.border,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
              }}
            >
              <Icon name="sparkles" size={11} stroke={2} color={t.green} />
              <Text
                style={{
                  fontFamily: t.sans,
                  fontSize: 11,
                  color: t.fg2,
                  fontWeight: "500",
                  letterSpacing: -0.1,
                }}
              >
                Settles in ~5 seconds on Stellar testnet
              </Text>
            </View>
          </View>

          {insufficient && (
            <Text
              style={{
                fontFamily: t.sans,
                color: t.error,
                fontSize: 12,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              You only have {userBalance.toFixed(2)} {asset}
            </Text>
          )}

          {/* Recipient */}
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            <Caption>To</Caption>
            <View style={{ height: 10 }} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: t.bg1,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 14,
                paddingHorizontal: 14,
                height: 52,
              }}
            >
              <TextInput
                value={recipient}
                onChangeText={setRecipient}
                placeholder="Stellar address (G… or C…)"
                placeholderTextColor={t.fg3}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  fontFamily: t.sans,
                  color: t.fg,
                  fontSize: 15,
                  letterSpacing: -0.2,
                }}
              />
            </View>
            {recipient.length > 0 && !validTarget && (
              <Text style={{ fontFamily: t.sans, color: t.error, fontSize: 12, marginTop: 6 }}>
                That doesn't look like a Stellar address.
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            <PrimaryButton
              icon="face-id"
              onPress={onSend}
              disabled={
                !walletAddress ||
                !validTarget ||
                parsed <= 0 ||
                insufficient ||
                submitting
              }
            >
              {submitting ? "Sending…" : "Send with Face ID"}
            </PrimaryButton>
            {tx.error && (
              <Text
                style={{
                  fontFamily: t.sans,
                  color: t.error,
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                {tx.error}
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={submitting} message={messageFor(tx.status)} />
    </Screen>
  );
}

function isLikelyStellarAddress(value: string): boolean {
  return /^[GC][A-Z2-7]{55}$/.test(value);
}

function messageFor(status: string) {
  switch (status) {
    case "building":
      return "Preparing send…";
    case "signing":
      return "Face ID required";
    case "submitting":
      return "Submitting…";
    case "confirming":
      return "Confirming…";
    default:
      return "";
  }
}
