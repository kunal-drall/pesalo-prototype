import { SupportedAsset } from "@/lib/utils/constants";

export type ContractCallRequest = {
  user: string;
  asset: SupportedAsset;
  amount: string;
};

export function buildFlexDeposit(request: ContractCallRequest) {
  return {
    method: "deposit_for_flex",
    args: request
  };
}

export function buildFlexWithdraw(request: ContractCallRequest) {
  return {
    method: "withdraw_flex",
    args: request
  };
}

export function buildFixedDeposit(request: ContractCallRequest & { market: string; minRate: string }) {
  return {
    method: "deposit_for_fixed_rate",
    args: request
  };
}

export function buildRedeemAtMaturity(user: string, market: string, ptAmount: string) {
  return {
    method: "redeem_at_maturity",
    args: { user, market, ptAmount }
  };
}

export function buildSend(request: ContractCallRequest & { destination: string; memo?: string }) {
  return {
    method: "send",
    args: request
  };
}
