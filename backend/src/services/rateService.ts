import { config, configuredFixedMarkets } from "../config";
import { AssetCode, AutoEarnRate, BoostRate, MarketSnapshot } from "../types";
import { getCached, setCached } from "./cache";
import { readContract } from "./sorobanReader";

const WAD = 10n ** 18n;
const RATES_CACHE_KEY = "earn-rates:v1";

/// Floor APYs surfaced for auto-earn until the Blend pool integration is live
/// and we can compute APY from b_rate exchange-rate growth. We deliberately
/// keep these at 0 rather than fabricate a number — the UI displays "0% APY"
/// for now, which honestly reflects what the SY adapter is paying out in
/// passive mode.
const AUTO_EARN_FLOOR: Record<AssetCode, number> = {
  USDC: 0,
  EURC: 0,
  XLM: 0,
};

type EarnRatesPayload = {
  autoEarn: AutoEarnRate[];
  boost: BoostRate[];
  updatedAt: string;
};

export const rateService = {
  async getRates(): Promise<EarnRatesPayload> {
    const cached = getCached<EarnRatesPayload>(RATES_CACHE_KEY);
    if (cached) return cached;
    return refresh();
  },

  async getMarkets(): Promise<MarketSnapshot[]> {
    const { boost } = await rateService.getRates();
    return boost.map((row) => ({
      address: row.market,
      asset: row.asset,
      maturity: row.maturity,
      daysRemaining: row.daysToExpiry,
      tvlSy: 0,
      impliedRateWad: BigInt(
        Math.round((row.boostAPY * Number(WAD)) / 100),
      ).toString(),
      impliedApy: row.boostAPY,
    }));
  },

  refresh,
};

async function refresh(): Promise<EarnRatesPayload> {
  const now = new Date().toISOString();
  const markets = configuredFixedMarkets();

  const boost = await Promise.all(
    markets.map(async (m): Promise<BoostRate | null> => {
      try {
        const [impliedRateWad, state] = await Promise.all([
          readContract<bigint>(m.market, "implied_rate", []),
          readContract<{
            maturity: bigint;
            created_at: bigint;
          }>(m.market, "state", []),
        ]);
        const maturityUnix = Number(state.maturity);
        const createdAtUnix = Number(state.created_at);
        const periodDays = Math.max(
          1,
          Math.round((maturityUnix - createdAtUnix) / 86_400),
        );
        const daysToExpiry = Math.max(
          0,
          Math.ceil((maturityUnix - Math.floor(Date.now() / 1000)) / 86_400),
        );
        // implied_rate is the *period* rate the curve fits to; annualise
        // for display as APY = (period_rate × 365 / period_days) × 100.
        const periodRate = Number(impliedRateWad) / Number(WAD);
        const boostAPY = (periodRate * 365 * 100) / periodDays;
        const autoEarnAPY = AUTO_EARN_FLOOR[m.asset];
        return {
          asset: m.asset,
          boostAPY,
          autoEarnAPY,
          rateDelta: boostAPY - autoEarnAPY,
          market: m.market,
          maturity: new Date(maturityUnix * 1000).toISOString(),
          daysToExpiry,
          updatedAt: now,
        };
      } catch (err) {
        console.error(`[rateService] boost ${m.asset} read failed:`, err);
        return null;
      }
    }),
  );

  const autoEarn: AutoEarnRate[] = (Object.keys(AUTO_EARN_FLOOR) as AssetCode[])
    .map((asset) => ({
      asset,
      apy: AUTO_EARN_FLOOR[asset],
      source: "Blend" as const,
      updatedAt: now,
    }))
    .filter((row) => {
      switch (row.asset) {
        case "USDC":
          return Boolean(config.contracts.usdcSy);
        case "EURC":
          return Boolean(config.contracts.eurcSy);
        case "XLM":
          return Boolean(config.contracts.xlmSy);
      }
    });

  const payload: EarnRatesPayload = {
    autoEarn,
    boost: boost.filter((b): b is BoostRate => b !== null),
    updatedAt: now,
  };
  setCached(RATES_CACHE_KEY, payload, config.cacheTtlMs);
  return payload;
}
