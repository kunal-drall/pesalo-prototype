export const PESALO_DOMAIN = "pesalo.app";
export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
export const DEFAULT_API_URL = "http://localhost:3001/v1";
export const DEFAULT_LAUNCHTUBE_URL = "https://testnet.launchtube.xyz";

export const SUPPORTED_ASSETS = ["USDC", "EURC", "XLM"] as const;
export type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];
