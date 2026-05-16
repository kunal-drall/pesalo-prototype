import { SupportedAsset } from "@/lib/utils/constants";

export type AssetBalance = {
  asset: SupportedAsset;
  /// Human-readable amount (e.g. 250.5 for 250.5 USDC).
  amount: number;
  /// USD value at the most-recent price snapshot.
  usdValue: number;
  /// 24-hour percentage change, when the price feed exposes it.
  change24h?: number;
};

export type TxResult = {
  hash: string;
  status: "pending" | "success" | "failed";
  ledger?: number;
};

export type SavingsPosition = {
  id: string;
  type: "fixed" | "flex";
  asset: SupportedAsset;
  amount: number;
  apy: number;
  earned: number;
  maturity?: string;
  market?: string;
  syContract?: string;
  splitterContract?: string;
  daysRemaining?: number;
  matured?: boolean;
};

export type ActivityEvent = {
  id: string;
  txHash: string;
  kind: "deposit_fixed" | "deposit_flex" | "withdraw_flex" | "send" | "receive" | "claim" | "redeem_maturity";
  asset: SupportedAsset;
  amount: number;
  counterparty?: string;
  occurredAt: string;
};
