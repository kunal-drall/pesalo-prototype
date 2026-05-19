export type AssetCode = "USDC" | "EURC" | "XLM";

/// Variable rate currently earned by an asset's auto-earn balance (sourced
/// from the SY adapter / Blend pool).
export type AutoEarnRate = {
  asset: AssetCode;
  apy: number;
  source: "Blend" | "Local";
  updatedAt: string;
};

/// Fixed rate available right now if a user boosts into the given market.
export type BoostRate = {
  asset: AssetCode;
  boostAPY: number;
  autoEarnAPY: number;
  /// boostAPY - autoEarnAPY (in percent units, e.g. 2.3 for +2.3 pts).
  rateDelta: number;
  market: string;
  maturity: string;
  daysToExpiry: number;
  updatedAt: string;
};

/// Auto-earning position (one row per asset). The user's idle balance is
/// always 0 in this model — every dollar is here.
export type AutoEarnPosition = {
  asset: AssetCode;
  syBalance: number;
  /// SY balance × exchange_rate, in underlying units.
  underlyingValue: number;
  currentAPY: number;
  /// Today's earnings in underlying units (projected from APY × balance).
  todayEarnings: number;
  syContract: string;
};

/// A boosted PT position locked in at a fixed rate.
export type BoostedPosition = {
  id: string;
  asset: AssetCode;
  ptAmount: number;
  /// Underlying value the PT will redeem for at maturity.
  underlyingAtMaturity: number;
  boostRate: number;
  maturity: string;
  daysRemaining: number;
  earnedSoFar: number;
  expectedTotal: number;
  /// 0..1 progress through the term.
  progress: number;
  market: string;
  splitterContract: string;
  matured: boolean;
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
    | "auto_deposit"
    | "auto_withdraw"
    | "boost"
    | "unboost"
    | "redeem_boost"
    | "send"
    | "receive";
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
