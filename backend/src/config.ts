import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  sorobanRpcUrl: process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org",
  horizonUrl: process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  networkPassphrase:
    process.env.STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  reflectorContract: process.env.REFLECTOR_CONTRACT_ID ?? "",
  contracts: {
    router: process.env.ROUTER_CONTRACT_ID ?? "",
    usdcMarket: process.env.USDC_MARKET_CONTRACT_ID ?? "",
    eurcMarket: process.env.EURC_MARKET_CONTRACT_ID ?? "",
    usdcSplitter: process.env.USDC_SPLITTER_CONTRACT_ID ?? "",
    eurcSplitter: process.env.EURC_SPLITTER_CONTRACT_ID ?? "",
    usdcSy: process.env.USDC_SY_CONTRACT_ID ?? "",
    eurcSy: process.env.EURC_SY_CONTRACT_ID ?? "",
    xlmSy: process.env.XLM_SY_CONTRACT_ID ?? "",
    usdcAsset: process.env.USDC_ASSET_CONTRACT_ID ?? "",
    eurcAsset: process.env.EURC_ASSET_CONTRACT_ID ?? "",
  },
  cacheTtlMs: Number(process.env.CACHE_TTL_MS ?? 30_000),
  rateRefreshIntervalSec: Number(process.env.RATE_REFRESH_INTERVAL_SEC ?? 60),
  priceRefreshIntervalSec: Number(process.env.PRICE_REFRESH_INTERVAL_SEC ?? 15),
  eventRefreshIntervalSec: Number(process.env.EVENT_REFRESH_INTERVAL_SEC ?? 30),
};

export type AssetMarketConfig = {
  asset: "USDC" | "EURC";
  market: string;
  splitter: string;
  sy: string;
  underlying: string;
};

export function configuredFixedMarkets(): AssetMarketConfig[] {
  const all: AssetMarketConfig[] = [
    {
      asset: "USDC",
      market: config.contracts.usdcMarket,
      splitter: config.contracts.usdcSplitter,
      sy: config.contracts.usdcSy,
      underlying: config.contracts.usdcAsset,
    },
    {
      asset: "EURC",
      market: config.contracts.eurcMarket,
      splitter: config.contracts.eurcSplitter,
      sy: config.contracts.eurcSy,
      underlying: config.contracts.eurcAsset,
    },
  ];
  return all.filter((m) => m.market && m.splitter && m.sy);
}
