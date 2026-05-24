import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Chip } from "@/components/design/Buttons";
import { Icon } from "@/components/design/Icon";
import { Screen } from "@/components/design/Screen";
import { Caption, Money } from "@/components/design/Text";
import { useTheme } from "@/lib/design/theme";
import { useRates } from "@/hooks/useRates";
import { FixedRate, FlexRate } from "@/lib/api/rates";
import { SupportedAsset } from "@/lib/utils/constants";
import { useWalletStore } from "@/stores/walletStore";

import { AssetIcon } from "@/components/design/Icon";

/// Boost tab — lists every open fixed-rate market with its boost APY,
/// the user's current auto-earn rate on that asset, and a worked example
/// derived from the user's actual balance (falls back to a $500 sample
/// when the user holds none of that asset yet).
export default function BoostTab() {
  const t = useTheme();
  const router = useRouter();
  const { fixed, flex, loading, error } = useRates();
  const balances = useWalletStore((s) => s.balances);

  const tenors = useMemo(() => {
    const days = Array.from(new Set(fixed.map((r) => r.days))).sort(
      (a, b) => a - b,
    );
    return days;
  }, [fixed]);

  return (
    <Screen topInset={0}>
      {/* NavBar */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 10,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 17,
            fontWeight: "600",
            color: t.fg,
            letterSpacing: -0.3,
          }}
        >
          Boost
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 14,
            color: t.fg2,
            lineHeight: 21,
            letterSpacing: -0.1,
            maxWidth: 320,
          }}
        >
          Already earning automatically. Lock for a higher fixed rate.
        </Text>
      </View>

      {/* Tenor chips — render only the tenors that actually have open
          markets. If we only have one tenor we still show it so the user
          sees the term length explicitly. */}
      {tenors.length > 0 && (
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            flexDirection: "row",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {tenors.map((d) => (
            <Chip key={d} label={`${d}d`} active={true} />
          ))}
        </View>
      )}

      {loading && (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ActivityIndicator color={t.green} />
        </View>
      )}

      {error && (
        <Text
          style={{
            fontFamily: t.sans,
            paddingHorizontal: 20,
            paddingTop: 16,
            color: t.error,
            fontSize: 13,
          }}
        >
          {error}
        </Text>
      )}

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          gap: 14,
        }}
      >
        {fixed.map((r) => (
          <BoostRateCard
            key={`${r.asset}-${r.maturity}-${r.market}`}
            rate={r}
            autoEarn={autoEarnFor(r.asset, flex)}
            userBalance={
              balances.find((b) => b.asset === r.asset)?.amount ?? 0
            }
            onSelect={() =>
              router.push({
                pathname: "/savings/deposit-fixed",
                params: { asset: r.asset, market: r.market, apy: String(r.apy) },
              })
            }
          />
        ))}
      </View>

      {!loading && fixed.length === 0 && !error && (
        <View
          style={{
            marginTop: 32,
            marginHorizontal: 20,
            padding: 18,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.bg1,
          }}
        >
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 14,
              color: t.fg2,
              letterSpacing: -0.1,
            }}
          >
            No fixed-rate markets are open right now. Check back in a few
            minutes.
          </Text>
        </View>
      )}

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 32,
          paddingBottom: 40,
          flexDirection: "row",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <Icon name="info" size={14} stroke={1.7} color={t.fg3} />
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.fg3,
            lineHeight: 18,
            letterSpacing: -0.05,
            flex: 1,
          }}
        >
          Boost locks your rate via on-chain yield trading. Early exit is
          allowed but may return less than the locked rate. At maturity,
          funds resume auto-earn automatically — no dead period.
        </Text>
      </View>
    </Screen>
  );
}

function autoEarnFor(asset: SupportedAsset, flex: FlexRate[]): number {
  return flex.find((f) => f.asset === asset)?.apy ?? 0;
}

function BoostRateCard({
  rate,
  autoEarn,
  userBalance,
  onSelect,
}: {
  rate: FixedRate;
  autoEarn: number;
  userBalance: number;
  onSelect: () => void;
}) {
  const t = useTheme();
  const delta = (rate.apy - autoEarn).toFixed(1);
  const maturityLabel = new Date(rate.maturity).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  /// Worked example: prefer the user's actual balance if they hold any of
  /// this asset; otherwise show a representative $500-style sample sized to
  /// the asset's typical unit. Earnings = principal * apy * (days/365).
  const exampleAmount = userBalance > 0 ? userBalance : sampleAmount(rate.asset);
  const exampleEarn = exampleAmount * (rate.apy / 100) * (rate.days / 365);

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        backgroundColor: t.bg1,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 18,
        padding: 20,
        overflow: "hidden",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {/* gold tint header */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          backgroundColor: t.goldGlow,
        }}
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AssetIcon symbol={rate.asset} size={32} />
          <View>
            <Text
              style={{
                fontFamily: t.sans,
                fontSize: 15,
                fontWeight: "600",
                color: t.fg,
                letterSpacing: -0.2,
              }}
            >
              {rate.asset}
            </Text>
            <Text
              style={{
                fontFamily: t.sans,
                fontSize: 12,
                color: t.fg3,
              }}
            >
              {rate.days} days
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.goldSoft,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
          }}
        >
          <Money size={12} weight="700" color={t.gold}>
            +{delta}%
          </Money>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 18 }}>
        <View>
          <Caption style={{ marginBottom: 4 }}>Boost</Caption>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Money size={40} weight="700" color={t.gold} style={{ letterSpacing: -1.6 }}>
              {rate.apy.toFixed(1)}
            </Money>
            <Text
              style={{
                fontFamily: t.sans,
                fontSize: 22,
                fontWeight: "700",
                color: t.gold,
                opacity: 0.7,
              }}
            >
              %
            </Text>
          </View>
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.fg3,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              fontWeight: "600",
              marginTop: 2,
            }}
          >
            fixed
          </Text>
        </View>
        <View style={{ paddingBottom: 6 }}>
          <Caption style={{ marginBottom: 4 }}>Auto-Earn</Caption>
          <Money size={20} weight="600" color={t.fg2} style={{ letterSpacing: -0.6 }}>
            {autoEarn.toFixed(1)}%
          </Money>
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.fg3,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              fontWeight: "600",
              marginTop: 2,
            }}
          >
            variable
          </Text>
        </View>
      </View>

      <View style={{ height: 16 }} />
      <Text
        style={{
          fontFamily: t.sans,
          fontSize: 13,
          color: t.fg2,
          letterSpacing: -0.1,
        }}
      >
        Matures {maturityLabel} · funds return to auto-earn
      </Text>

      <View style={{ height: 14 }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: t.bg0,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Icon name="sparkles" size={14} stroke={1.6} color={t.gold} />
        <Text style={{ fontFamily: t.sans, fontSize: 13, color: t.fg2, letterSpacing: -0.1 }}>
          {formatAmount(exampleAmount, rate.asset)} boosted
        </Text>
        <Text style={{ fontFamily: t.sans, fontSize: 13, color: t.fg3 }}>→</Text>
        <Text
          style={{
            fontFamily: t.sans,
            fontSize: 13,
            color: t.fg,
            fontWeight: "500",
          }}
        >
          earn {formatAmount(exampleEarn, rate.asset)}
        </Text>
      </View>

      <View style={{ height: 16 }} />
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <View
          style={{
            height: 44,
            paddingHorizontal: 22,
            borderRadius: 22,
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: t.bg3,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
          }}
        >
          <Icon name="flame" size={14} stroke={2} color={t.gold} />
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 14,
              fontWeight: "600",
              color: t.fg,
              letterSpacing: -0.1,
            }}
          >
            Boost
          </Text>
          <Icon name="chevron-right" size={14} stroke={2} color={t.fg} />
        </View>
      </View>
    </Pressable>
  );
}

function sampleAmount(asset: SupportedAsset): number {
  if (asset === "USDC") return 500;
  if (asset === "EURC") return 500;
  return 1000;
}

function formatAmount(amount: number, asset: SupportedAsset) {
  const digits = asset === "XLM" ? 1 : 2;
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)} ${asset}`;
}
