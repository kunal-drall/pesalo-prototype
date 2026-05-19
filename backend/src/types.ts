export type AssetCode = "USDC" | "EURC" | "XLM";

export type RateInfo = {
  asset: AssetCode;
  maturity: string;
  fixedAPY: number;
  days: number;
  market: string;
  updatedAt: string;
};

export type FlexRateInfo = {
  asset: AssetCode;
  apy: number;
  updatedAt: string;
};

export type PositionInfo = {
  id: string;
  asset: AssetCode;
  type: "fixed" | "flex";
  amount: number;
  earned: number;
  apy: number;
  maturity?: string;
  market?: string;
  syContract?: string;
  splitterContract?: string;
  daysRemaining?: number;
  matured?: boolean;
};

export type PriceInfo = {
  USDC_USD: number;
  EURC_USD: number;
  XLM_USD: number;
  updatedAt: string;
};

export type ActivityEvent = {
  id: string;
  txHash: string;
  kind:
    | "deposit_fixed"
    | "deposit_flex"
    | "withdraw_flex"
    | "send"
    | "receive"
    | "claim"
    | "redeem_maturity";
  asset: AssetCode;
  amount: number;
  counterparty?: string;
  occurredAt: string;
};

export type MarketSnapshot = {
  address: string;
  asset: AssetCode;
  maturity: string;
  daysRemaining: number;
  tvlSy: number;
  /// Serialised as a decimal string for JSON-safety.
  impliedRateWad: string;
  impliedApy: number;
};
