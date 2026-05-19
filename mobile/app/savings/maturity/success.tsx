import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Text, View } from "react-native";

import { PrimaryButton } from "@/components/design/Buttons";
import { Icon } from "@/components/design/Icon";
import { Screen } from "@/components/design/Screen";
import { Money } from "@/components/design/Text";
import { useTheme } from "@/lib/design/theme";
import { useRates } from "@/hooks/useRates";
import { SupportedAsset } from "@/lib/utils/constants";

/// Post-boost success — confetti, big check, summary of what just landed.
/// All values arrive via search params from the confirm screen; no
/// hard-coded amounts.
export default function BoostSuccessScreen() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    asset?: string;
    amount?: string;
    apy?: string;
  }>();
  const asset: SupportedAsset =
    params.asset === "USDC" || params.asset === "EURC" ? params.asset : "USDC";
  const amount = Number(params.amount ?? "0") || 0;
  const apy = Number(params.apy ?? "0") || 0;

  const { fixed } = useRates();
  const rate = fixed.find((r) => r.asset === asset && Math.abs(r.apy - apy) < 0.01);
  const maturityLabel = rate?.maturity
    ? new Date(rate.maturity).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const days = rate?.days ?? 0;
  const earn = amount * (apy / 100) * (days / 365);

  const popScale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(popScale, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [popScale]);

  return (
    <Screen scrollable={false} topInset={0}>
      <View style={{ flex: 1 }}>
        <Confetti />
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <View style={{ alignItems: "center" }}>
            <Animated.View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(34,197,94,0.16)",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: popScale }],
              }}
            >
              <Icon name="check" size={36} stroke={2.5} color={t.success} />
            </Animated.View>
            <View style={{ height: 18 }} />
            <Text
              style={{
                fontFamily: t.sans,
                fontSize: 22,
                fontWeight: "700",
                color: t.fg,
                letterSpacing: -0.6,
                textAlign: "center",
              }}
            >
              Boost Confirmed
            </Text>
            <View style={{ height: 8 }} />
            <Money size={16} weight="500" color={t.fg2}>
              {formatAsset(amount, asset)} boosted
            </Money>
            <View style={{ height: 4 }} />
            <Text
              style={{
                fontFamily: t.sans,
                fontSize: 14,
                color: t.gold,
                fontWeight: "500",
              }}
            >
              Locked at {apy.toFixed(1)}% APY · {days} days
            </Text>
          </View>

          <View style={{ height: 28 }} />

          <View style={{ borderTopWidth: 1, borderTopColor: t.border }} />
          <DetailRow label="Matures" value={maturityLabel} />
          <DetailRow
            label="You'll earn"
            value={earn > 0 ? `+${formatAsset(earn, asset)}` : "—"}
            color={t.gold}
            weight="600"
          />
          <View style={{ borderTopWidth: 1, borderTopColor: t.border }} />
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
          <PrimaryButton onPress={() => router.replace("/(tabs)")}>Done</PrimaryButton>
          <View style={{ height: 14 }} />
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 13,
              color: t.fg3,
              textAlign: "center",
            }}
            onPress={() => router.replace("/(tabs)")}
          >
            Returns auto-earning at maturity
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function DetailRow({
  label,
  value,
  color,
  weight = "500",
}: {
  label: string;
  value: string;
  color?: string;
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
      <Text style={{ fontFamily: t.sans, fontSize: 15, color: t.fg2, letterSpacing: -0.1 }}>
        {label}
      </Text>
      <Money size={15} weight={weight} color={color}>
        {value}
      </Money>
    </View>
  );
}

/// Lightweight confetti — animated dots falling from the top edge using
/// the Animated API. No external dep.
function Confetti() {
  const t = useTheme();
  const bits = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: 20 + Math.random() * 280,
        delay: Math.random() * 600,
        color: i % 3 === 0 ? t.green : i % 3 === 1 ? t.gold : "#fff",
        size: 3 + Math.random() * 5,
        duration: 1500 + Math.random() * 1500,
      })),
    [t.green, t.gold],
  );
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
      }}
    >
      {bits.map((b, i) => (
        <ConfettiDot key={i} {...b} />
      ))}
    </View>
  );
}

function ConfettiDot({
  x,
  delay,
  color,
  size,
  duration,
}: {
  x: number;
  delay: number;
  color: string;
  size: number;
  duration: number;
}) {
  const y = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, {
          toValue: 700,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [y, opacity, delay, duration]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: color,
        transform: [{ translateY: y }],
        opacity,
      }}
    />
  );
}

function formatAsset(amount: number, asset: SupportedAsset) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ${asset}`;
}
