import { useRouter, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Icon } from "@/components/design/Icon";
import { NavBar } from "@/components/design/NavBar";
import { Screen } from "@/components/design/Screen";
import { Caption, Money } from "@/components/design/Text";
import { useTheme } from "@/lib/design/theme";
import { useWalletStore } from "@/stores/walletStore";

/// Position detail — locked-rate progress ring + stats grid sourced
/// directly from the SavingsPosition the backend returns. No mocked
/// charts; if we can't derive a fact, we omit it.
export default function PositionDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const positions = useWalletStore((s) => s.positions);
  const position = useMemo(
    () => positions.find((p) => p.id === id),
    [positions, id],
  );

  if (!position) {
    return (
      <Screen topInset={0}>
        <NavBar title="Position" onBack={() => router.back()} />
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 22,
              fontWeight: "600",
              color: t.fg,
              letterSpacing: -0.6,
            }}
          >
            Position not found
          </Text>
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 14,
              color: t.fg2,
              marginTop: 8,
            }}
          >
            This deposit may have already matured or been redeemed.
          </Text>
        </View>
      </Screen>
    );
  }

  const daysLeft = position.daysRemaining ?? 0;
  const totalDays = useMemo(() => {
    if (!position.maturity) return 0;
    const maturityMs = new Date(position.maturity).getTime();
    return Math.max(daysLeft, Math.round((maturityMs - Date.now()) / 86_400_000) + 0);
  }, [position.maturity, daysLeft]);

  /// Approximate term length from days-remaining + position age, falling
  /// back to a sane default if we have no other anchor. We avoid the
  /// hard-coded 90-day assumption that used to ship here.
  const termDays = useMemo(() => {
    if (position.maturity) {
      const maturity = new Date(position.maturity).getTime();
      const remainingMs = daysLeft * 86_400_000;
      const startedMs = maturity - remainingMs;
      return Math.max(1, Math.round((maturity - startedMs) / 86_400_000));
    }
    return Math.max(daysLeft, 1);
  }, [position.maturity, daysLeft]);
  void totalDays;

  const progress = termDays > 0 ? Math.max(0, Math.min(100, ((termDays - daysLeft) / termDays) * 100)) : 0;
  const expectedRemaining = position.amount * (position.apy / 100) * (daysLeft / 365);
  const expectedTotal = position.earned + expectedRemaining;
  const maturityShort = position.maturity
    ? new Date(position.maturity).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "—";
  const maturityLong = position.maturity
    ? new Date(position.maturity).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <Screen topInset={0}>
      <NavBar
        title={position.type === "fixed" ? "Boosted" : "Auto-Earn"}
        onBack={() => router.back()}
        badge={position.asset}
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon
            name={position.type === "fixed" ? "lock" : "sparkles"}
            size={14}
            stroke={2}
            color={position.type === "fixed" ? t.gold : t.green}
          />
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 12,
              fontWeight: "700",
              color: position.type === "fixed" ? t.gold : t.green,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {position.type === "fixed" ? "Fixed" : "Auto"} {position.apy.toFixed(1)}%
          </Text>
        </View>
        <Money size={32} weight="700" style={{ letterSpacing: -1.2 }}>
          {formatAsset(position.amount, position.asset)}
        </Money>
        <View style={{ height: 6 }} />
        {position.type === "fixed" && position.maturity && (
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 14,
              color: t.fg2,
            }}
          >
            Returns to auto-earn on{" "}
            <Text style={{ color: t.fg, fontWeight: "600" }}>{maturityShort}</Text>
          </Text>
        )}
      </View>

      {position.type === "fixed" && (
        <View style={{ alignItems: "center", paddingTop: 32 }}>
          <ProgressRing size={168} stroke={5} progress={progress} daysLeft={daysLeft} />
        </View>
      )}

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 28,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <StatCard label="Earned" value={formatAsset(position.earned, position.asset)} accent={t.gold} />
        {position.type === "fixed" && (
          <StatCard
            label="Expected"
            value={formatAsset(expectedTotal, position.asset)}
            accent={t.fg2}
          />
        )}
        {position.maturity && (
          <StatCard label="Matures" value={maturityLong} accent={t.fg2} />
        )}
        <StatCard label="APY" value={`${position.apy.toFixed(1)}%`} accent={position.type === "fixed" ? t.gold : t.green} />
      </View>

      {position.type === "fixed" && (
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View
            style={{
              backgroundColor: t.bg1,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Icon name="info" size={16} stroke={1.8} color={t.fg2} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: t.sans,
                  fontSize: 14,
                  fontWeight: "600",
                  color: t.fg,
                  marginBottom: 4,
                }}
              >
                Early exit (unboost)
              </Text>
              <Text
                style={{
                  fontFamily: t.sans,
                  fontSize: 12,
                  color: t.fg3,
                  lineHeight: 18,
                }}
              >
                Sell your position at the current market rate. Funds resume
                auto-earn immediately. May return less than your locked rate.
              </Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/savings/maturity/[id]",
                    params: { id: position.id },
                  })
                }
                hitSlop={6}
                style={{ paddingTop: 8 }}
              >
                <Text
                  style={{
                    fontFamily: t.sans,
                    color: t.error,
                    fontSize: 13,
                    fontWeight: "600",
                    letterSpacing: -0.1,
                  }}
                >
                  Unboost early →
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

function ProgressRing({
  size,
  stroke,
  progress,
  daysLeft,
}: {
  size: number;
  stroke: number;
  progress: number;
  daysLeft: number;
}) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={t.bg3}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={t.gold}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Money size={36} weight="700" style={{ letterSpacing: -1.5, lineHeight: 38 }}>
          {daysLeft}
        </Money>
        <View style={{ height: 4 }} />
        <Text style={{ fontFamily: t.sans, fontSize: 13, color: t.fg2, letterSpacing: 0.2 }}>
          days left
        </Text>
      </View>
    </View>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        backgroundColor: t.bg1,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 12,
        padding: 16,
        gap: 6,
      }}
    >
      <Caption>{label}</Caption>
      <Money size={18} weight="600" color={accent ?? t.fg}>
        {value}
      </Money>
    </View>
  );
}

function formatAsset(amount: number, asset: string) {
  const digits = asset === "XLM" ? 2 : 2;
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: 4,
  }).format(amount)} ${asset}`;
}
