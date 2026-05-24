import { ReactNode } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { useEffect, useRef } from "react";

import { useTheme } from "@/lib/design/theme";
import { SupportedAsset } from "@/lib/utils/constants";

import { AssetIcon, Icon } from "./Icon";
import { Money } from "./Text";

/// Pulsing dot used next to "Earning X% APY" labels. The slow scale
/// animation matches the design canvas's `pesaloPulse` keyframe.
export function PulseDot({ size = 6, color }: { size?: number; color?: string }) {
  const t = useTheme();
  const c = color ?? t.green;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.35,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.65,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: c,
        shadowColor: c,
        shadowOpacity: 0.6,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

/// "Earning X% APY" pill — green chip with a pulsing dot. Goes under the
/// hero total balance on Home.
export function EarningPill({ apyText }: { apyText: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(22,163,103,0.12)",
        borderWidth: 1,
        borderColor: "rgba(22,163,103,0.2)",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
      }}
    >
      <PulseDot color={t.green} />
      <Text
        style={{
          fontSize: 13,
          color: t.green,
          fontWeight: "600",
          letterSpacing: -0.1,
          fontFamily: t.sans,
        }}
      >
        Earning {apyText} APY
      </Text>
    </View>
  );
}

/// Single asset row on Home — icon left, APY underneath the symbol,
/// balance + today's earnings right-aligned. The `onPress` lets us
/// open per-asset detail later.
export function AssetRow({
  symbol,
  amountLabel,
  apyText,
  todayEarnText,
  isLast,
  onPress,
}: {
  symbol: SupportedAsset;
  amountLabel: string;
  apyText: string;
  todayEarnText: string;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
        minHeight: 76,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: t.border,
        backgroundColor: pressed ? t.bg2 : "transparent",
      })}
    >
      <AssetIcon symbol={symbol} size={40} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 16,
            fontWeight: "600",
            color: t.fg,
            letterSpacing: -0.3,
          }}
        >
          {symbol}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <PulseDot size={5} color={t.green} />
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 13,
              color: t.green,
              fontWeight: "500",
              letterSpacing: -0.1,
            }}
          >
            Earning {apyText} APY
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Money size={16} weight="500">
          {amountLabel}
        </Money>
        <Money size={13} weight="500" color={t.success}>
          +{todayEarnText} today
        </Money>
      </View>
    </Pressable>
  );
}

/// "Boost available" amber CTA card. Reads boost rate + delta vs the
/// asset's current auto-earn rate so the user sees the upgrade plainly.
export function BoostCTA({
  asset,
  boostRate,
  autoEarnRate,
  days,
  onPress,
}: {
  asset: SupportedAsset;
  boostRate: number;
  autoEarnRate: number;
  days: number;
  onPress?: () => void;
}) {
  const t = useTheme();
  const delta = (boostRate - autoEarnRate).toFixed(1);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "100%",
        backgroundColor: t.bg1,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 18,
        padding: 20,
        opacity: pressed ? 0.92 : 1,
        overflow: "hidden",
      })}
    >
      {/* Amber tint at the top — gradient via two stacked Views to
          approximate the design's linear-gradient without a deps. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 100,
          backgroundColor: t.goldGlow,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon name="flame" size={16} stroke={2} color={t.gold} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 11,
            fontWeight: "700",
            color: t.gold,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          Boost available
        </Text>
      </View>
      <Text
        style={{
          fontFamily: t.sans,
          fontSize: 22,
          fontWeight: "600",
          color: t.fg,
          letterSpacing: -0.6,
          lineHeight: 26,
        }}
      >
        Lock {asset} at <Text style={{ color: t.gold }}>{boostRate.toFixed(1)}%</Text> for {days} days
      </Text>
      <View style={{ height: 12 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.goldSoft,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
          }}
        >
          <Money size={13} weight="700" color={t.gold}>
            +{delta}%
          </Money>
        </View>
        <Text style={{ fontFamily: t.sans, fontSize: 13, color: t.fg2, letterSpacing: -0.1 }}>
          above auto-earn
        </Text>
      </View>
    </Pressable>
  );
}

/// Boosted position card — locked PT position display. Progress bar runs
/// 0..100 across the term.
export function BoostedPositionCard({
  asset,
  rate,
  balance,
  earned,
  daysLeft,
  progress,
  onPress,
}: {
  asset: string;
  rate: number;
  balance: string;
  earned: string;
  daysLeft: number;
  progress: number;
  onPress?: () => void;
}) {
  const t = useTheme();
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "100%",
        backgroundColor: t.bg1,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 16,
        padding: 18,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon name="lock" size={13} stroke={2} color={t.gold} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            fontWeight: "700",
            color: t.fg2,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          {asset} · {rate.toFixed(1)}% fixed
        </Text>
      </View>
      <Money size={22} weight="600">
        {balance}
      </Money>
      <View style={{ height: 14 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Money size={13} weight="500" color={t.gold}>
          Earned {earned}
        </Money>
        <Text style={{ fontFamily: t.sans, fontSize: 13, color: t.fg3 }}>
          {daysLeft} days left
        </Text>
      </View>
      <View
        style={{
          height: 4,
          backgroundColor: t.bg3,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 4,
            width: `${clamped}%`,
            backgroundColor: t.green,
            borderRadius: 4,
          }}
        />
      </View>
    </Pressable>
  );
}

/// Helper to render the title row above each section ("Assets · Auto-Earn",
/// "Boosted", etc.). Mirrors the design's caption styling.
export function SectionHeader({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 14,
      }}
    >
      <Text
        style={{
          margin: 0,
          fontFamily: t.sans,
          fontSize: 20,
          fontWeight: "600",
          color: t.fg,
          letterSpacing: -0.4,
        }}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}
