import { config, configuredFixedMarkets } from "../config";
import { AssetCode, AutoEarnPosition, BoostedPosition } from "../types";
import { rateService } from "./rateService";
import { addr, readContract } from "./sorobanReader";

const WAD = 10n ** 18n;
const DECIMALS_BY_ASSET: Record<AssetCode, number> = { USDC: 7, EURC: 7, XLM: 7 };

type PositionsResponse = {
  address: string;
  autoEarn: AutoEarnPosition[];
  boosted: BoostedPosition[];
  updatedAt: string;
};

export const positionService = {
  async getPositions(address: string): Promise<PositionsResponse> {
    const updatedAt = new Date().toISOString();
    const [autoEarn, boosted] = await Promise.all([
      collectAutoEarnPositions(address),
      collectBoostedPositions(address),
    ]);
    return { address, autoEarn, boosted, updatedAt };
  },
};

async function collectAutoEarnPositions(
  address: string,
): Promise<AutoEarnPosition[]> {
  const { autoEarn: rates } = await rateService.getRates();
  const rateByAsset = new Map(rates.map((r) => [r.asset, r.apy]));

  const configs: Array<{ asset: AssetCode; sy: string }> = (
    [
      { asset: "USDC", sy: config.contracts.usdcSy },
      { asset: "EURC", sy: config.contracts.eurcSy },
      { asset: "XLM", sy: config.contracts.xlmSy },
    ] as Array<{ asset: AssetCode; sy: string }>
  ).filter((c) => c.sy);

  const positions = await Promise.all(
    configs.map(async ({ asset, sy }): Promise<AutoEarnPosition | null> => {
      try {
        const [balanceRaw, exchangeRateWad] = await Promise.all([
          readContract<bigint>(sy, "balance", [addr(address)]),
          readContract<bigint>(sy, "exchange_rate", []),
        ]);
        if (balanceRaw <= 0n) return null;

        const decimals = DECIMALS_BY_ASSET[asset];
        const underlyingRaw = (balanceRaw * exchangeRateWad) / WAD;
        const syBalance = Number(balanceRaw) / 10 ** decimals;
        const underlyingValue = Number(underlyingRaw) / 10 ** decimals;
        const currentAPY = rateByAsset.get(asset) ?? 0;
        // Projected daily earnings = underlying × (apy/100) / 365.
        const todayEarnings = (underlyingValue * currentAPY) / 100 / 365;

        return {
          asset,
          syBalance,
          underlyingValue,
          currentAPY,
          todayEarnings,
          syContract: sy,
        };
      } catch (err) {
        console.error(`[positionService] auto-earn ${asset} failed:`, err);
        return null;
      }
    }),
  );
  return positions.filter((p): p is AutoEarnPosition => p !== null);
}

async function collectBoostedPositions(
  address: string,
): Promise<BoostedPosition[]> {
  const markets = configuredFixedMarkets();
  const positions = await Promise.all(
    markets.map(async (m): Promise<BoostedPosition | null> => {
      try {
        const [ptRaw, maturityBig, createdAtBig, impliedRateWad] =
          await Promise.all([
            readContract<bigint>(m.splitter, "pt_balance", [addr(address)]),
            readContract<bigint>(m.market, "maturity", []),
            readContract<{ created_at: bigint }>(m.market, "state", []).then(
              (s) => s.created_at,
            ),
            readContract<bigint>(m.market, "implied_rate", []),
          ]);

        if (ptRaw <= 0n) return null;

        const maturityUnix = Number(maturityBig);
        const createdAtUnix = Number(createdAtBig);
        const now = Math.floor(Date.now() / 1000);
        const totalSeconds = Math.max(1, maturityUnix - createdAtUnix);
        const elapsedSeconds = Math.max(0, now - createdAtUnix);
        const progress = Math.min(1, elapsedSeconds / totalSeconds);
        const daysRemaining = Math.max(
          0,
          Math.ceil((maturityUnix - now) / 86_400),
        );
        const matured = now >= maturityUnix;

        const decimals = DECIMALS_BY_ASSET[m.asset];
        // PT redeems 1:1 for underlying at maturity (in asset units).
        const underlyingAtMaturity = Number(ptRaw) / 10 ** decimals;

        const periodDays = Math.max(1, totalSeconds / 86_400);
        const periodRate = Number(impliedRateWad) / Number(WAD);
        const boostRate = (periodRate * 365 * 100) / periodDays;
        const expectedTotal = (underlyingAtMaturity * boostRate) / 100 *
          (totalSeconds / 86_400) / 365;
        const earnedSoFar = expectedTotal * progress;

        return {
          id: `${m.asset.toLowerCase()}-boost-${maturityUnix}`,
          asset: m.asset,
          ptAmount: underlyingAtMaturity,
          underlyingAtMaturity,
          boostRate,
          maturity: new Date(maturityUnix * 1000).toISOString(),
          daysRemaining,
          earnedSoFar,
          expectedTotal,
          progress,
          market: m.market,
          splitterContract: m.splitter,
          matured,
        };
      } catch (err) {
        console.error(`[positionService] boost ${m.asset} failed:`, err);
        return null;
      }
    }),
  );
  return positions.filter((p): p is BoostedPosition => p !== null);
}
