import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  sorobanRpcUrl: process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org",
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  contracts: {
    router: process.env.ROUTER_CONTRACT_ID ?? "",
    usdcMarket: process.env.USDC_MARKET_CONTRACT_ID ?? "",
    eurcMarket: process.env.EURC_MARKET_CONTRACT_ID ?? ""
  }
};
