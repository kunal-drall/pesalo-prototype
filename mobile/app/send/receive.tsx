import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { QRCode } from "@/components/QRCode";
import { GhostButton, PrimaryButton } from "@/components/design/Buttons";
import { Icon } from "@/components/design/Icon";
import { NavBar } from "@/components/design/NavBar";
import { Screen } from "@/components/design/Screen";
import { Caption } from "@/components/design/Text";
import { useTheme } from "@/lib/design/theme";
import { fundWithFriendbot } from "@/lib/stellar/friendbot";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";

/// Receive — QR + copyable address + Friendbot refill button for
/// testnet accounts. Mainnet builds should hide the Friendbot row.
export default function ReceiveScreen() {
  const t = useTheme();
  const router = useRouter();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const refresh = useWalletStore((s) => s.refresh);
  const [copied, setCopied] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundMsg, setFundMsg] = useState<string | null>(null);

  async function copy() {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function fund() {
    if (!walletAddress) return;
    setFunding(true);
    setFundMsg(null);
    const result = await fundWithFriendbot(walletAddress);
    setFunding(false);
    setFundMsg(
      result.ok
        ? result.alreadyFunded
          ? "Account is already funded."
          : "Funded with 10,000 testnet XLM."
        : result.message ?? "Friendbot failed.",
    );
    if (result.ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
    }
  }

  if (!walletAddress) {
    return (
      <Screen topInset={0}>
        <NavBar title="Receive" onBack={() => router.back()} />
        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <Text style={{ fontFamily: t.sans, fontSize: 16, color: t.fg2 }}>
            Sign in before sharing your address.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen topInset={0}>
      <NavBar title="Receive" onBack={() => router.back()} />

      <View style={{ paddingHorizontal: 24, paddingTop: 24, alignItems: "center" }}>
        <View
          style={{
            padding: 18,
            borderRadius: 18,
            backgroundColor: "#fff",
          }}
        >
          <QRCode value={walletAddress} />
        </View>

        <View style={{ height: 24 }} />

        <Caption>Your Stellar address</Caption>
        <View style={{ height: 8 }} />
        <Text
          style={{
            fontFamily: t.mono,
            fontSize: 13,
            color: t.fg,
            letterSpacing: 0.2,
            textAlign: "center",
            maxWidth: 320,
          }}
          selectable
        >
          {walletAddress}
        </Text>

        <View style={{ height: 20 }} />

        <PrimaryButton onPress={copy} icon={copied ? "check" : "copy"}>
          {copied ? "Copied" : "Copy Address"}
        </PrimaryButton>
        <View style={{ height: 10 }} />
        <GhostButton onPress={fund}>
          {funding ? "Funding via Friendbot…" : "Get testnet XLM (Friendbot)"}
        </GhostButton>
        {fundMsg && (
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 12,
              color: t.fg3,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {fundMsg}
          </Text>
        )}
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 24, flexDirection: "row", gap: 10 }}>
        <Icon name="info" size={14} stroke={1.7} color={t.fg3} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.fg3,
            lineHeight: 18,
            flex: 1,
            letterSpacing: -0.05,
          }}
        >
          Anyone with this address can send you USDC, EURC, or XLM. Funds
          arrive in seconds on Stellar.
        </Text>
      </View>

      <Pressable onPress={() => {}} hitSlop={6} style={{ height: 0 }} />
    </Screen>
  );
}
