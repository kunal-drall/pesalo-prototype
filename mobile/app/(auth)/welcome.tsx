import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { PrimaryButton } from "@/components/design/Buttons";
import { Icon, Sprout } from "@/components/design/Icon";
import { Screen } from "@/components/design/Screen";
import { Money } from "@/components/design/Text";
import { useRates } from "@/hooks/useRates";
import { useTheme } from "@/lib/design/theme";

/// Welcome — first screen for new users. The two rate cards (Auto-Earn /
/// Boost) read from the live rates endpoint so the headline numbers
/// reflect what the user will actually get.
export default function WelcomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const rates = useRates();
  const flex = rates.flex ?? [];
  const fixed = rates.fixed ?? [];

  /// Pick representative rates from real markets. We highlight USDC since
  /// it's the most likely first deposit; if USDC isn't available we fall
  /// back to whatever asset the backend is offering today.
  const headlineFlex = useMemo(() => {
    const usdc = flex.find((f) => f.asset === "USDC");
    return usdc ?? flex[0] ?? null;
  }, [flex]);

  const headlineBoost = useMemo(() => {
    const usdc = fixed.find((r) => r.asset === "USDC");
    return usdc ?? fixed[0] ?? null;
  }, [fixed]);

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
            fontSize: 36,
            fontWeight: "700",
            color: t.fg,
            letterSpacing: -1.4,
            lineHeight: 38,
            maxWidth: 280,
          }}
        >
          Your money starts{"\n"}earning the moment{"\n"}it arrives.
        </Text>
        <View style={{ height: 14 }} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 16,
            fontWeight: "400",
            color: t.fg2,
            letterSpacing: -0.2,
            lineHeight: 23,
            maxWidth: 300,
          }}
        >
          {headlineFlex && headlineBoost
            ? `${headlineFlex.apy.toFixed(1)}% APY automatically. Lock for ${headlineBoost.apy.toFixed(1)}% guaranteed.`
            : "Earn automatically. Lock for a higher fixed rate."}
        </Text>

        <View style={{ marginTop: 32, flexDirection: "row", gap: 10 }}>
          <RateCard
            icon="sparkles"
            iconColor={t.green}
            label="Auto-Earn"
            apy={headlineFlex?.apy ?? null}
            footer="variable · always on"
          />
          <RateCard
            icon="lock"
            iconColor={t.gold}
            label="Boost"
            apy={headlineBoost?.apy ?? null}
            footer={
              headlineBoost ? `fixed · ${headlineBoost.days} days` : "fixed"
            }
            tint
          />
        </View>

        <View style={{ flex: 1 }} />

        <PrimaryButton onPress={() => router.push("/(auth)/create")}>
          Create Account
        </PrimaryButton>
        <View style={{ height: 4 }} />
        <Pressable
          onPress={async () => {
            // "I already have an account" uses the existing on-device
            // keys (passkey credential or stored dev keypair) to log in.
            // The auth gate in root layout routes us into /(tabs) when
            // a wallet address is found.
            const { useAuthStore } = await import("@/stores/authStore");
            await useAuthStore.getState().login();
          }}
          style={({ pressed }) => ({
            height: 52,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: t.sans,
              color: t.fg2,
              fontSize: 16,
              fontWeight: "500",
              letterSpacing: -0.2,
            }}
          >
            I already have an account
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function RateCard({
  icon,
  iconColor,
  label,
  apy,
  footer,
  tint,
}: {
  icon: "sparkles" | "lock";
  iconColor: string;
  label: string;
  apy: number | null;
  footer: string;
  tint?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.bg1,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {tint && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: t.goldGlow,
          }}
        />
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Icon name={icon} size={13} stroke={1.8} color={iconColor} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 11,
            fontWeight: "700",
            color: t.fg2,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Money size={22} weight="700" style={{ letterSpacing: -0.6 }}>
          {apy !== null ? apy.toFixed(1) : "—"}
        </Money>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 14,
            color: t.fg2,
            fontWeight: "500",
            marginLeft: 4,
          }}
        >
          % APY
        </Text>
      </View>
      <Text
        style={{
          fontFamily: t.sans,
          fontSize: 11,
          color: t.fg3,
          marginTop: 4,
        }}
      >
        {footer}
      </Text>
    </View>
  );
}
