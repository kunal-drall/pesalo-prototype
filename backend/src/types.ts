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
  amount: string;
  earned: string;
  rate: number;
  maturity?: string;
};

export type PriceInfo = {
  XLM_USD: number;
  EURC_USD: number;
  updatedAt: string;
};
