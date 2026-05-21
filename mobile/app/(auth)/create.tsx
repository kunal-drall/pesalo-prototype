import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { PrimaryButton } from "@/components/design/Buttons";
import { Icon, Sprout } from "@/components/design/Icon";
import { Screen } from "@/components/design/Screen";
import { useTheme } from "@/lib/design/theme";
import { useAuthStore } from "@/stores/authStore";

/// Create flow. Wallet provisioning happens behind a single tap — tries
/// PasskeyKit smart-wallet first, falls back to a testnet keypair funded
/// by Friendbot when WebAuthn isn't available (iOS Simulator etc.). On
/// success the root layout's auth gate redirects to /(tabs).
export default function CreateAccountScreen() {
  const t = useTheme();
  const router = useRouter();
  const createAccount = useAuthStore((s) => s.createAccount);
  const error = useAuthStore((s) => s.error);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    try {
      const address = await createAccount();
      if (address) {
        // Root layout watches walletAddress and redirects to /(tabs).
        // We still call replace() explicitly so the back button doesn't
        // pop the user back into auth.
        router.replace("/(tabs)");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scrollable={false}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
      >
        <View style={{ height: 60 }} />
        <Sprout size={56} color={t.green} />
        <View style={{ height: 24 }} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 32,
            fontWeight: "700",
            color: t.fg,
            letterSpacing: -1.2,
            lineHeight: 36,
          }}
        >
          Create your account
        </Text>
        <View style={{ height: 12 }} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 16,
            color: t.fg2,
            lineHeight: 23,
            letterSpacing: -0.2,
            maxWidth: 320,
          }}
        >
          Face ID or your device passkey protects your savings. No seed
          phrases, no backups to lose.
        </Text>

        <View style={{ height: 24 }} />

        <FeatureRow
          icon="shield"
          title="Keys never leave your device"
          body="Your private key is bound to this device's secure enclave."
        />
        <FeatureRow
          icon="sparkles"
          title="Earn the moment you deposit"
          body="USDC, EURC, and XLM auto-route into yield."
        />
        <FeatureRow
          icon="refresh"
          title="Testnet account funded automatically"
          body="We fund your wallet with testnet XLM via Friendbot so you can try every flow."
        />

        <View style={{ flex: 1 }} />

        {error && (
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 13,
              color: t.error,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        )}

        <PrimaryButton
          onPress={handleCreate}
          disabled={busy}
          icon={busy ? undefined : "face-id"}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            "Create with Face ID"
          )}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

function FeatureRow({
  icon,
  title,
  body,
}: {
  icon: "shield" | "sparkles" | "refresh";
  title: string;
  body: string;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 14,
        alignItems: "flex-start",
        paddingVertical: 10,
      }}
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
        <Icon name={icon} size={16} stroke={1.8} color={t.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 15,
            fontWeight: "600",
            color: t.fg,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 13,
            color: t.fg3,
            marginTop: 2,
            lineHeight: 18,
          }}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}
