export const PESALO_DOMAIN = "pesalo.fun";
export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export const DEFAULT_RPC_URL =
  process.env.EXPO_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const DEFAULT_HORIZON_URL =
  process.env.EXPO_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001/v1";
/// OpenZeppelin Stellar Channels (the relayer that replaced SDF's Launchtube).
/// Get a testnet API key at https://channels.openzeppelin.com/testnet/gen.
export const CHANNELS_BASE_URL =
  process.env.EXPO_PUBLIC_CHANNELS_BASE_URL ?? "https://channels.openzeppelin.com/testnet";
export const CHANNELS_API_KEY = process.env.EXPO_PUBLIC_CHANNELS_API_KEY ?? "";

export const SUPPORTED_ASSETS = ["USDC", "EURC", "XLM"] as const;
export type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

/// Resolved contract IDs come from the EAS build environment (sourced from
/// scripts/initialize-protocol.sh writing into eas.json's `extra` field).
export const CONTRACTS = {
  router: process.env.EXPO_PUBLIC_ROUTER_CONTRACT_ID ?? "",
  usdcMarket: process.env.EXPO_PUBLIC_USDC_MARKET_CONTRACT_ID ?? "",
  eurcMarket: process.env.EXPO_PUBLIC_EURC_MARKET_CONTRACT_ID ?? "",
  usdcSy: process.env.EXPO_PUBLIC_USDC_SY_CONTRACT_ID ?? "",
  eurcSy: process.env.EXPO_PUBLIC_EURC_SY_CONTRACT_ID ?? "",
  xlmSy: process.env.EXPO_PUBLIC_XLM_SY_CONTRACT_ID ?? "",
  usdcSplitter: process.env.EXPO_PUBLIC_USDC_SPLITTER_CONTRACT_ID ?? "",
  eurcSplitter: process.env.EXPO_PUBLIC_EURC_SPLITTER_CONTRACT_ID ?? "",
  usdcAsset: process.env.EXPO_PUBLIC_USDC_ASSET_CONTRACT_ID ?? "",
  eurcAsset: process.env.EXPO_PUBLIC_EURC_ASSET_CONTRACT_ID ?? "",
  passkeyFactory: process.env.EXPO_PUBLIC_PASSKEY_FACTORY_ID ?? "",
  passkeyWalletWasmHash: process.env.EXPO_PUBLIC_PASSKEY_WALLET_HASH ?? "",
} as const;

export const ASSET_DECIMALS: Record<SupportedAsset, number> = {
  USDC: 7,
  EURC: 7,
  XLM: 7,
};

export function getAssetContracts(asset: SupportedAsset) {
  switch (asset) {
    case "USDC":
      return {
        sy: CONTRACTS.usdcSy,
        market: CONTRACTS.usdcMarket,
        splitter: CONTRACTS.usdcSplitter,
        underlying: CONTRACTS.usdcAsset,
        supportsFixed: true,
      };
    case "EURC":
      return {
        sy: CONTRACTS.eurcSy,
        market: CONTRACTS.eurcMarket,
        splitter: CONTRACTS.eurcSplitter,
        underlying: CONTRACTS.eurcAsset,
        supportsFixed: true,
      };
    case "XLM":
      return {
        sy: CONTRACTS.xlmSy,
        market: "",
        splitter: "",
        underlying: "",
        supportsFixed: false,
      };
  }
}
