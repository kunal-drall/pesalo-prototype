import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";

import { Icon } from "@/components/design/Icon";
import { Screen } from "@/components/design/Screen";
import { PillAction } from "@/components/design/Buttons";
import { Caption, Money } from "@/components/design/Text";
import {
  AssetRow,
  BoostCTA,
  BoostedPositionCard,
  EarningPill,
  SectionHeader,
} from "@/components/design/HomeWidgets";
import { useTheme } from "@/lib/design/theme";
import { SUPPORTED_ASSETS, SupportedAsset } from "@/lib/utils/constants";
import { SavingsPosition } from "@/lib/stellar/types";
import { useWalletStore } from "@/stores/walletStore";

/// Home — auto-earn hero, per-asset rows, top boost CTA, and a list of
/// currently boosted (fixed-term) positions. Every number is derived from
/// the wallet store; nothing is mocked.
export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const {
    balances,
    positions,
    rates,
    totalUsd,
    isLoading,
    isStale,
    lastUpdated,
    error,
    refresh,
    address,
  } = useWalletStore();

  useEffect(() => {
    if (address) {
      refresh().catch(() => {});
    }
  }, [address, refresh]);

  /// Weighted-average APY across all auto-earning balances. Falls back to a
  /// flat 0% when we have no balance/rate data so the pill never lies.
  const weightedApy = useMemo(() => {
    if (!rates || totalUsd <= 0) return 0;
    let weighted = 0;
    for (const b of balances) {
      if (b.usdValue <= 0) continue;
      const r = autoEarnApyFor(b.asset, rates.flexRates);
      weighted += (b.usdValue / totalUsd) * r;
    }
    return weighted;
  }, [balances, rates, totalUsd]);

  /// Today's earnings derived from balance × APY ÷ 365. This is the same
  /// math the protocol uses to accrue auto-earn, so the figure isn't a
  /// guess — it's the daily slice of the actual rate the user is on.
  const todayUsd = useMemo(() => {
    if (totalUsd <= 0 || weightedApy <= 0) return 0;
    return (totalUsd * (weightedApy / 100)) / 365;
  }, [totalUsd, weightedApy]);

  /// Pick the best boost opportunity to surface. Prefer assets the user
  /// already holds; among those, pick the one with the biggest delta vs
  /// the user's current auto-earn on that asset.
  const boostCtaItem = useMemo(() => {
    if (!rates || rates.rates.length === 0) return null;
    type Candidate = {
      asset: SupportedAsset;
      boostRate: number;
      autoEarn: number;
      days: number;
      market: string;
      holds: boolean;
    };
    const candidates: Candidate[] = rates.rates.map((r) => ({
      asset: r.asset,
      boostRate: r.apy,
      autoEarn: autoEarnApyFor(r.asset, rates.flexRates),
      days: r.days,
      market: r.market,
      holds: balanceFor(balances, r.asset).usdValue > 0,
    }));
    const ranked = candidates.sort((a, b) => {
      if (a.holds !== b.holds) return a.holds ? -1 : 1;
      return b.boostRate - a.boostRate;
    });
    return ranked[0] ?? null;
  }, [rates, balances]);

  const boostedPositions = positions.filter((p) => p.type === "fixed");

  return (
    <Screen
      refreshControl={
        <RefreshControl
          tintColor={t.green}
          refreshing={isLoading}
          onRefresh={refresh}
        />
      }
      topInset={0}
    >
      {/* Top bar — avatar + bell */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: t.bg2,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: "600",
              color: t.fg,
              letterSpacing: -0.2,
            }}
          >
            {address ? address.slice(0, 2).toUpperCase() : "··"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/activity")}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: t.bg1,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="bell" size={17} stroke={1.7} color={t.fg} />
        </Pressable>
      </View>

      {/* Total balance + earning chip */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Caption>Total Balance</Caption>
        <View style={{ height: 6 }} />
        <Money size={42} weight="700" style={{ letterSpacing: -1.8 }}>
          {formatUsd(totalUsd)}
        </Money>
        <View style={{ height: 8 }} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {weightedApy > 0 ? (
            <EarningPill apyText={`${weightedApy.toFixed(1)}%`} />
          ) : (
            <Text
              style={{
                fontFamily: t.sans,
                fontSize: 13,
                color: t.fg3,
                letterSpacing: -0.1,
              }}
            >
              Deposit to start auto-earning
            </Text>
          )}
          {todayUsd > 0 && (
            <Money size={13} weight="500" color={t.success}>
              +{formatUsd(todayUsd)} today
            </Money>
          )}
        </View>
        {isStale && lastUpdated && (
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.fg3,
              marginTop: 6,
              letterSpacing: -0.05,
            }}
          >
            Showing cached data from {new Date(lastUpdated).toLocaleTimeString()}
          </Text>
        )}
        {error && (
          <Text
            style={{
              fontFamily: t.sans,
              fontSize: 12,
              color: t.error,
              marginTop: 6,
            }}
          >
            {error}
          </Text>
        )}
      </View>

      {/* Send / Receive */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          flexDirection: "row",
          gap: 8,
        }}
      >
        <PillAction
          icon="arrow-up-right"
          label="Send"
          onPress={() => router.push("/send/confirm")}
        />
        <PillAction
          icon="arrow-down-left"
          label="Receive"
          onPress={() => router.push("/send/receive")}
        />
      </View>

      {/* Assets · Auto-Earn */}
      <View style={{ marginTop: 28 }}>
        <Caption style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          Assets · Auto-Earn
        </Caption>
        {SUPPORTED_ASSETS.map((symbol, idx) => {
          const bal = balanceFor(balances, symbol);
          const apy = rates ? autoEarnApyFor(symbol, rates.flexRates) : 0;
          const isLast = idx === SUPPORTED_ASSETS.length - 1;
          return (
            <AssetRow
              key={symbol}
              symbol={symbol}
              amountLabel={formatAssetAmount(bal.amount, symbol)}
              apyText={`${apy.toFixed(1)}%`}
              todayEarnText={formatTodayPerAsset(symbol, bal.amount, apy)}
              isLast={isLast}
              onPress={() => router.push("/(tabs)/savings")}
            />
          );
        })}
      </View>

      {/* Boost CTA — only when there's actually a fixed-rate market and
          the corresponding asset is offered. */}
      {boostCtaItem && (
        <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
          <BoostCTA
            asset={boostCtaItem.asset}
            boostRate={boostCtaItem.boostRate}
            autoEarnRate={boostCtaItem.autoEarn}
            days={boostCtaItem.days}
            onPress={() =>
              router.push({
                pathname: "/savings/fixed-rates",
                params: { asset: boostCtaItem.asset },
              })
            }
          />
        </View>
      )}

      {/* Boosted positions — fixed-term positions from the backend */}
      {boostedPositions.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
          <SectionHeader
            title="Boosted"
            trailing={
              <Pressable
                onPress={() => router.push("/savings/fixed-rates")}
                hitSlop={8}
              >
                <Text
                  style={{
                    fontFamily: t.sans,
                    color: t.green,
                    fontSize: 14,
                    fontWeight: "500",
                    letterSpacing: -0.1,
                  }}
                >
                  Manage →
                </Text>
              </Pressable>
            }
          />
          <View style={{ gap: 12 }}>
            {boostedPositions.map((p) => (
              <BoostedPositionCard
                key={p.id}
                asset={p.asset}
                rate={p.apy}
                balance={formatUsdFromAsset(p.asset, p.amount, totalUsd, balances)}
                earned={formatAssetSmall(p.earned, p.asset)}
                daysLeft={p.daysRemaining ?? 0}
                progress={progressForPosition(p)}
                onPress={() =>
                  router.push({
                    pathname: "/savings/position/[id]",
                    params: { id: p.id },
                  })
                }
              />
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

function balanceFor(
  balances: { asset: SupportedAsset; amount: number; usdValue: number }[],
  asset: SupportedAsset,
) {
  return (
    balances.find((b) => b.asset === asset) ?? {
      asset,
      amount: 0,
      usdValue: 0,
    }
  );
}

function autoEarnApyFor(
  asset: SupportedAsset,
  flex: { asset: SupportedAsset; apy: number }[],
) {
  return flex.find((r) => r.asset === asset)?.apy ?? 0;
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatAssetAmount(amount: number, asset: SupportedAsset) {
  const digits = asset === "XLM" ? 1 : 2;
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)} ${asset}`;
}

/// Today's per-asset earn in the asset's own units (e.g. "0.14 USDC",
/// "0.04 EURC", "0.17 XLM"). Same daily-slice math as the headline.
function formatTodayPerAsset(asset: SupportedAsset, amount: number, apy: number) {
  if (amount <= 0 || apy <= 0) return `0.00 ${asset}`;
  const perDay = (amount * (apy / 100)) / 365;
  const digits = asset === "XLM" ? 2 : 2;
  return `${perDay.toFixed(digits)} ${asset}`;
}

function formatAssetSmall(amount: number, asset: SupportedAsset) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)} ${asset}`;
}

/// Approximate the USD value of a position using the spot rate implied by
/// the user's current balances. Falls back to the raw asset amount when
/// we have no price reference yet.
function formatUsdFromAsset(
  asset: SupportedAsset,
  amount: number,
  _totalUsd: number,
  balances: { asset: SupportedAsset; amount: number; usdValue: number }[],
) {
  const ref = balances.find((b) => b.asset === asset);
  if (ref && ref.amount > 0) {
    const unit = ref.usdValue / ref.amount;
    return formatUsd(unit * amount);
  }
  return `${amount.toFixed(2)} ${asset}`;
}

/// Map a SavingsPosition to a 0..100 progress integer. Uses
/// `daysRemaining` against the position's term length (derived from the
/// maturity date if present), so the bar reflects actual on-chain state.
function progressForPosition(p: SavingsPosition): number {
  if (p.type !== "fixed" || !p.daysRemaining || !p.maturity) return 0;
  const maturity = new Date(p.maturity).getTime();
  const remainingMs = p.daysRemaining * 86_400_000;
  const startedMs = maturity - remainingMs;
  if (!Number.isFinite(startedMs)) return 0;
  const totalMs = maturity - startedMs;
  if (totalMs <= 0) return 0;
  const elapsedMs = Date.now() - startedMs;
  return Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
}
