import { config, configuredFixedMarkets } from "../config";
import { AssetCode, PositionInfo } from "../types";
import { addr, readContract } from "./sorobanReader";

const WAD = 10n ** 18n;
const DECIMALS_BY_ASSET: Record<AssetCode, number> = { USDC: 7, EURC: 7, XLM: 7 };

type PositionsResponse = {
  address: string;
  fixed: PositionInfo[];
  flex: PositionInfo[];
  updatedAt: string;
};

export const positionService = {
  async getPositions(address: string): Promise<PositionsResponse> {
    const updatedAt = new Date().toISOString();
    const [fixed, flex] = await Promise.all([
      collectFixedPositions(address, updatedAt),
      collectFlexPositions(address, updatedAt),
    ]);
    return { address, fixed, flex, updatedAt };
  },
};

async function collectFixedPositions(
  address: string,
  updatedAt: string,
): Promise<PositionInfo[]> {
  const markets = configuredFixedMarkets();
  const positions = await Promise.all(
    markets.map(async (m): Promise<PositionInfo | null> => {
      try {
        const [ptRaw, ytRaw, pendingYieldRaw, maturityBig, impliedRateWad] = await Promise.all([
          readContract<bigint>(m.splitter, "pt_balance", [addr(address)]),
          readContract<bigint>(m.splitter, "yt_balance", [addr(address)]),
          readContract<bigint>(m.splitter, "pending_yield", [addr(address)]),
          readContract<bigint>(m.market, "maturity", []),
          readContract<bigint>(m.market, "implied_rate", []),
        ]);

        if (ptRaw <= 0n && ytRaw <= 0n) return null;

        const maturityUnix = Number(maturityBig);
        const daysRemaining = Math.max(
          0,
          Math.ceil((maturityUnix - Math.floor(Date.now() / 1000)) / 86_400),
        );
        const matured = daysRemaining === 0;
        const decimals = DECIMALS_BY_ASSET[m.asset];
        const amount = Number(ptRaw) / 10 ** decimals;
        const earned = Number(pendingYieldRaw) / 10 ** decimals;
        const apy = (Number(impliedRateWad) / Number(WAD)) * 100;

        return {
          id: `${m.asset.toLowerCase()}-fixed-${maturityUnix}`,
          asset: m.asset,
          type: "fixed",
          amount,
          earned,
          apy,
          maturity: new Date(maturityUnix * 1000).toISOString(),
          market: m.market,
          splitterContract: m.splitter,
          syContract: m.sy,
          daysRemaining,
          matured,
        };
      } catch (err) {
        console.error(`[positionService] fixed ${m.asset} read failed:`, err);
        return null;
      }
    }),
  );
  return positions.filter((p): p is PositionInfo => p !== null);
}

async function collectFlexPositions(
  address: string,
  _updatedAt: string,
): Promise<PositionInfo[]> {
  const flexConfigs: Array<{ asset: AssetCode; sy: string }> = (
    [
      { asset: "USDC", sy: config.contracts.usdcSy },
      { asset: "EURC", sy: config.contracts.eurcSy },
      { asset: "XLM", sy: config.contracts.xlmSy },
    ] as Array<{ asset: AssetCode; sy: string }>
  ).filter((c) => c.sy);

  const positions = await Promise.all(
    flexConfigs.map(async ({ asset, sy }): Promise<PositionInfo | null> => {
      try {
        const [balanceRaw, exchangeRateWad] = await Promise.all([
          readContract<bigint>(sy, "balance", [addr(address)]),
          readContract<bigint>(sy, "exchange_rate", []),
        ]);
        if (balanceRaw <= 0n) return null;

        const decimals = DECIMALS_BY_ASSET[asset];
        // SY balance × exchange_rate (asset/SY) gives the underlying value.
        const underlyingRaw = (balanceRaw * exchangeRateWad) / WAD;
        const amount = Number(underlyingRaw) / 10 ** decimals;

        return {
          id: `${asset.toLowerCase()}-flex`,
          asset,
          type: "flex",
          amount,
          earned: 0,
          apy: 0,
          syContract: sy,
        };
      } catch (err) {
        console.error(`[positionService] flex ${asset} read failed:`, err);
        return null;
      }
    }),
  );

  return positions.filter((p): p is PositionInfo => p !== null);
}
