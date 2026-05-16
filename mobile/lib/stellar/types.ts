import { SupportedAsset } from "@/lib/utils/constants";

export type AssetBalance = {
  asset: SupportedAsset;
  amount: number;
  usdValue: number;
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
};
