import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { GhostButton } from "@/components/design/Buttons";
import { Icon, IconName } from "@/components/design/Icon";
import { NavBar } from "@/components/design/NavBar";
import { Screen } from "@/components/design/Screen";
import { Caption, Money } from "@/components/design/Text";
import { useTheme } from "@/lib/design/theme";
import { fundWithFriendbot } from "@/lib/stellar/friendbot";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";

/// Settings — address card, Friendbot refill, link to security/about,
/// sign-out (wipes device keys + cached state). Replaces the old
/// link-list settings page.
export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const signOutAuth = useAuthStore((s) => s.signOut);
  const refresh = useWalletStore((s) => s.refresh);
  const [copied, setCopied] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundMsg, setFundMsg] = useState<string | null>(null);

  async function copyAddress() {
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
          ? "Already funded on testnet."
          : "Funded with 10,000 testnet XLM."
        : result.message ?? "Friendbot failed.",
    );
    if (result.ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
    }
  }

  async function handleSignOut() {
    await signOutAuth();
    router.replace("/(auth)/welcome");
  }

  return (
    <Screen topInset={0}>
      <NavBar title="Settings" onBack={() => router.back()} />

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Caption>Wallet</Caption>
        <View style={{ height: 8 }} />
        <View
          style={{
            backgroundColor: t.bg1,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontFamily: t.sans, fontSize: 12, color: t.fg3, letterSpacing: 0.4 }}>
            STELLAR ADDRESS
          </Text>
          <View style={{ height: 6 }} />
          <Text
            style={{
              fontFamily: t.mono,
              fontSize: 13,
              color: t.fg,
              letterSpacing: 0.2,
            }}
            selectable
          >
            {walletAddress ?? "Not signed in"}
          </Text>
          {walletAddress && (
            <>
              <View style={{ height: 12 }} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <GhostButton onPress={copyAddress} style={{ flex: 1 }}>
                  {copied ? "Copied" : "Copy address"}
                </GhostButton>
                <GhostButton onPress={fund} style={{ flex: 1 }}>
                  {funding ? "Funding…" : "Friendbot refill"}
                </GhostButton>
              </View>
              {fundMsg && (
                <Text
                  style={{
                    fontFamily: t.sans,
                    fontSize: 12,
                    color: t.fg3,
                    marginTop: 8,
                  }}
                >
                  {fundMsg}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Caption>About</Caption>
        <View style={{ height: 8 }} />
        <Row icon="shield" label="Security" onPress={() => router.push("/settings/security")} />
        <Row icon="info" label="About Pesalo" onPress={() => router.push("/settings/about")} isLast />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => ({
            paddingVertical: 14,
            alignItems: "center",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 15,
              fontWeight: "600",
              color: t.error,
              letterSpacing: -0.1,
            }}
          >
            Sign out
          </Text>
        </Pressable>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.fg3,
            marginTop: 8,
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          Wipes the device key. To get back in you'll create a new account.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
        <Money size={11} weight="500" color={t.fg3}>
          Stellar testnet · Pesalo dev build
        </Money>
      </View>
    </Screen>
  );
}

function Row({
  icon,
  label,
  onPress,
  isLast,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: t.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: t.bg2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={16} stroke={1.8} color={t.fg2} />
      </View>
      <Text style={{ fontFamily: t.sans, fontSize: 15, color: t.fg, flex: 1 }}>{label}</Text>
      <Icon name="chevron-right" size={16} stroke={1.8} color={t.fg3} />
    </Pressable>
  );
}
