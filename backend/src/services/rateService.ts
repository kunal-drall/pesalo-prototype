import { configuredFixedMarkets, config } from "../config";
import { FlexRateInfo, MarketSnapshot, RateInfo } from "../types";
import { getCached, setCached } from "./cache";
import { readContract } from "./sorobanReader";

const WAD = 10n ** 18n;
const RATES_CACHE_KEY = "rates:v1";
const FLEX_DEFAULT_APY: Record<"USDC" | "EURC" | "XLM", number> = {
  USDC: 0,
  EURC: 0,
  XLM: 0,
};

type RatesPayload = {
  rates: RateInfo[];
  flexRates: FlexRateInfo[];
  updatedAt: string;
};

export const rateService = {
  /// Returns whatever the in-memory cache holds without trying to refresh.
  /// The cron job in jobs/ratePoller.ts is responsible for keeping it warm.
  async getRates(): Promise<RatesPayload> {
    const cached = getCached<RatesPayload>(RATES_CACHE_KEY);
    if (cached) return cached;
    return refreshRates();
  },

  async getMarkets(): Promise<MarketSnapshot[]> {
    const { rates } = await rateService.getRates();
    return rates.map((rate) => ({
      address: rate.market,
      asset: rate.asset,
      maturity: rate.maturity,
      daysRemaining: rate.days,
      tvlSy: 0,
      impliedRateWad: BigInt(Math.round(rate.fixedAPY * Number(WAD) / 100)),
      impliedApy: rate.fixedAPY,
    }));
  },

  refresh: refreshRates,
};

async function refreshRates(): Promise<RatesPayload> {
  const now = new Date().toISOString();
  const markets = configuredFixedMarkets();

  const fixed = await Promise.all(
    markets.map(async (m): Promise<RateInfo | null> => {
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
        const periodDays = Math.max(1, Math.round((maturityUnix - createdAtUnix) / 86_400));
        const daysRemaining = Math.max(
          0,
          Math.ceil((maturityUnix - Math.floor(Date.now() / 1000)) / 86_400),
        );
        // implied_rate is the constant *period* rate the curve fits to. Annualize
        // for display:  APY = implied_rate × 365 / period_days.
        const periodRate = Number(impliedRateWad) / Number(WAD);
        const fixedAPY = (periodRate * 365) / periodDays * 100;
        return {
          asset: m.asset,
          maturity: new Date(maturityUnix * 1000).toISOString(),
          fixedAPY,
          days: daysRemaining,
          market: m.market,
          updatedAt: now,
        };
      } catch (err) {
        console.error(`[rateService] ${m.asset} market read failed:`, err);
        return null;
      }
    }),
  );

  const validFixed = fixed.filter((r): r is RateInfo => r !== null);
  const flexRates = await collectFlexRates(now);

  const payload: RatesPayload = {
    rates: validFixed,
    flexRates,
    updatedAt: now,
  };
  setCached(RATES_CACHE_KEY, payload, config.cacheTtlMs);
  return payload;
}

async function collectFlexRates(updatedAt: string): Promise<FlexRateInfo[]> {
  // Flex APY is read from Blend pool state. Until the Blend integration is
  // wired we return whatever the configured floor is — never a fake number.
  // A non-zero APY appears here only after a real Blend pool read populates it.
  return (Object.keys(FLEX_DEFAULT_APY) as Array<keyof typeof FLEX_DEFAULT_APY>)
    .filter((asset) => FLEX_DEFAULT_APY[asset] > 0)
    .map((asset) => ({ asset, apy: FLEX_DEFAULT_APY[asset], updatedAt }));
}

function wadToPercent(wad: bigint): number {
  return (Number(wad) / Number(WAD)) * 100;
}
