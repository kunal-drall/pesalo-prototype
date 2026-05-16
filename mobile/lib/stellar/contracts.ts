import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

import { stellarClient } from "@/lib/stellar/client";
import {
  ASSET_DECIMALS,
  CONTRACTS,
  SupportedAsset,
  getAssetContracts,
} from "@/lib/utils/constants";

const WAD = 10n ** 18n;
const SECONDS_PER_YEAR = 31_536_000n;

function addr(value: string): xdr.ScVal {
  return Address.fromString(value).toScVal();
}

function i128(value: bigint | number): xdr.ScVal {
  const big = typeof value === "bigint" ? value : BigInt(value);
  return nativeToScVal(big, { type: "i128" });
}

export function toRawAmount(asset: SupportedAsset, human: string | number): bigint {
  const decimals = ASSET_DECIMALS[asset];
  const [int, frac = ""] = String(human).split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(int || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

export function fromRawAmount(asset: SupportedAsset, raw: bigint): number {
  const decimals = ASSET_DECIMALS[asset];
  return Number(raw) / 10 ** decimals;
}

/* ------- Router calls (user-facing operations) ------- */

export async function buildFixedDeposit(params: {
  user: string;
  asset: SupportedAsset;
  amount: string;
  minYieldRaw?: bigint;
}): Promise<string> {
  const contracts = getAssetContracts(params.asset);
  if (!contracts.supportsFixed) {
    throw new Error(`${params.asset} does not support fixed savings yet`);
  }
  if (!CONTRACTS.router || !contracts.market) {
    throw new Error("Contracts not configured (run scripts/initialize-protocol.sh)");
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: CONTRACTS.router,
    method: "deposit_for_fixed_rate",
    args: [
      addr(params.user),
      addr(contracts.market),
      i128(toRawAmount(params.asset, params.amount)),
      i128(params.minYieldRaw ?? 0n),
    ],
  });
}

export async function buildFlexDeposit(params: {
  user: string;
  asset: SupportedAsset;
  amount: string;
}): Promise<string> {
  const contracts = getAssetContracts(params.asset);
  if (!CONTRACTS.router || !contracts.sy) {
    throw new Error("Contracts not configured");
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: CONTRACTS.router,
    method: "deposit_for_flex",
    args: [
      addr(params.user),
      addr(contracts.sy),
      i128(toRawAmount(params.asset, params.amount)),
    ],
  });
}

export async function buildFlexWithdraw(params: {
  user: string;
  asset: SupportedAsset;
  syAmountRaw: bigint;
}): Promise<string> {
  const contracts = getAssetContracts(params.asset);
  if (!CONTRACTS.router || !contracts.sy) {
    throw new Error("Contracts not configured");
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: CONTRACTS.router,
    method: "withdraw_flex",
    args: [addr(params.user), addr(contracts.sy), i128(params.syAmountRaw)],
  });
}

export async function buildRedeemAtMaturity(params: {
  user: string;
  asset: SupportedAsset;
  ptAmountRaw: bigint;
}): Promise<string> {
  const contracts = getAssetContracts(params.asset);
  if (!CONTRACTS.router || !contracts.market) {
    throw new Error("Contracts not configured");
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: CONTRACTS.router,
    method: "redeem_at_maturity",
    args: [addr(params.user), addr(contracts.market), i128(params.ptAmountRaw)],
  });
}

export async function buildClaimYield(params: {
  user: string;
  asset: SupportedAsset;
}): Promise<string> {
  const contracts = getAssetContracts(params.asset);
  if (!CONTRACTS.router || !contracts.market) {
    throw new Error("Contracts not configured");
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: CONTRACTS.router,
    method: "claim_yield",
    args: [addr(params.user), addr(contracts.market)],
  });
}

/* ------- Plain asset transfer (send screen) ------- */

export async function buildAssetTransfer(params: {
  from: string;
  to: string;
  asset: SupportedAsset;
  amount: string;
}): Promise<string> {
  const tokenContract =
    params.asset === "XLM" ? nativeXlmContract() : getAssetContracts(params.asset).underlying;
  if (!tokenContract) {
    throw new Error(`${params.asset} contract not configured`);
  }
  return stellarClient.buildContractCall({
    source: params.from,
    contractId: tokenContract,
    method: "transfer",
    args: [
      addr(params.from),
      addr(params.to),
      i128(toRawAmount(params.asset, params.amount)),
    ],
  });
}

function nativeXlmContract(): string {
  return (
    process.env.EXPO_PUBLIC_XLM_SAC_CONTRACT_ID ??
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
  );
}

/* ------- Pure reads ------- */

export async function readSyExchangeRate(syContractId: string): Promise<bigint> {
  return stellarClient.readContract<bigint>(syContractId, "exchange_rate", []);
}

export async function readMarketImpliedRate(marketContractId: string): Promise<bigint> {
  return stellarClient.readContract<bigint>(marketContractId, "implied_rate", []);
}

export async function readMarketMaturity(marketContractId: string): Promise<bigint> {
  return stellarClient.readContract<bigint>(marketContractId, "maturity", []);
}

export async function readPtBalance(
  splitterContractId: string,
  holder: string,
): Promise<bigint> {
  return stellarClient.readContract<bigint>(splitterContractId, "pt_balance", [addr(holder)]);
}

export async function readYtBalance(
  splitterContractId: string,
  holder: string,
): Promise<bigint> {
  return stellarClient.readContract<bigint>(splitterContractId, "yt_balance", [addr(holder)]);
}

export async function readSyBalance(
  syContractId: string,
  holder: string,
): Promise<bigint> {
  return stellarClient.readContract<bigint>(syContractId, "balance", [addr(holder)]);
}

export async function readPendingYield(
  splitterContractId: string,
  holder: string,
): Promise<bigint> {
  return stellarClient.readContract<bigint>(splitterContractId, "pending_yield", [addr(holder)]);
}

/* ------- Rate math ------- */

export function impliedRateToApyPercent(impliedRateWad: bigint): number {
  return (Number(impliedRateWad) / Number(WAD)) * 100;
}

export function daysUntil(unixSeconds: bigint | number): number {
  const target = typeof unixSeconds === "bigint" ? Number(unixSeconds) : unixSeconds;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.ceil((target - now) / 86_400));
}

export { WAD, SECONDS_PER_YEAR };
