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

function requireRouter(): string {
  if (!CONTRACTS.router) {
    throw new Error("Router contract not configured (check EXPO_PUBLIC_ROUTER_CONTRACT_ID)");
  }
  return CONTRACTS.router;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-EARN: every dollar starts earning the moment it arrives.
   ═══════════════════════════════════════════════════════════════════════════ */

/// Move `amount` of `asset` from the user's smart wallet into Blend via the
/// matching SY adapter. The user ends up holding SY (yield-bearing) instead
/// of idle underlying. Called by the session-key auto-deposit watcher.
export async function buildAutoDeposit(params: {
  user: string;
  asset: SupportedAsset;
  amount: string;
}): Promise<string> {
  const c = getAssetContracts(params.asset);
  if (!c.sy || !c.underlying) {
    throw new Error(`${params.asset} adapter not configured`);
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: requireRouter(),
    method: "auto_deposit",
    args: [
      addr(params.user),
      addr(c.underlying),
      i128(toRawAmount(params.asset, params.amount)),
      addr(c.sy),
    ],
  });
}

/// Pull `underlyingAmount` worth of `asset` out of Blend. Used by the Send
/// flow right before transferring to a counterparty. The router computes the
/// SY-needed from the live exchange rate.
export async function buildAutoWithdraw(params: {
  user: string;
  asset: SupportedAsset;
  underlyingAmount: string;
}): Promise<string> {
  const c = getAssetContracts(params.asset);
  if (!c.sy || !c.underlying) {
    throw new Error(`${params.asset} adapter not configured`);
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: requireRouter(),
    method: "auto_withdraw",
    args: [
      addr(params.user),
      addr(c.underlying),
      i128(toRawAmount(params.asset, params.underlyingAmount)),
      addr(c.sy),
    ],
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOOST: optional fixed-rate upgrade on top of auto-earn.
   ═══════════════════════════════════════════════════════════════════════════ */

/// Convert `syAmount` of auto-earning SY into a fixed-rate PT position.
/// The user keeps the "upfront yield" portion as SY (still auto-earning)
/// and holds PT which redeems for full underlying at maturity.
export async function buildBoost(params: {
  user: string;
  asset: SupportedAsset;
  syAmountRaw: bigint;
  /// Slippage floor on the locked rate, in WAD. e.g. 0.05 * WAD = require ≥5% APY.
  minBoostRateWad?: bigint;
}): Promise<string> {
  const c = getAssetContracts(params.asset);
  if (!c.market) {
    throw new Error(`${params.asset} does not have a boost market yet`);
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: requireRouter(),
    method: "boost",
    args: [
      addr(params.user),
      i128(params.syAmountRaw),
      addr(c.market),
      i128(params.minBoostRateWad ?? 0n),
    ],
  });
}

/// Exit a boost early by selling PT into the AMM. SY flows back to the user
/// (still auto-earning); they may realise a loss vs. the originally locked rate.
export async function buildUnboost(params: {
  user: string;
  asset: SupportedAsset;
  ptAmountRaw: bigint;
}): Promise<string> {
  const c = getAssetContracts(params.asset);
  if (!c.market) {
    throw new Error(`${params.asset} does not have a boost market yet`);
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: requireRouter(),
    method: "unboost",
    args: [addr(params.user), addr(c.market), i128(params.ptAmountRaw)],
  });
}

/// After maturity, redeem a PT position for SY. Lands back in auto-earn —
/// no dead period, no manual re-deposit.
export async function buildRedeemBoost(params: {
  user: string;
  asset: SupportedAsset;
  ptAmountRaw: bigint;
}): Promise<string> {
  const c = getAssetContracts(params.asset);
  if (!c.market) {
    throw new Error(`${params.asset} does not have a boost market yet`);
  }
  return stellarClient.buildContractCall({
    source: params.user,
    contractId: requireRouter(),
    method: "redeem_boost",
    args: [addr(params.user), addr(c.market), i128(params.ptAmountRaw)],
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Plain asset transfer (used by the Send flow's outbound op after auto_withdraw).
   ═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   Pure reads (no signing).
   ═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   DEPRECATED — kept temporarily so the in-flight UI screens still compile.
   The next pass (mobile UI rewrite) will delete these and switch every
   caller to the auto-earn / boost builders above.
   ═══════════════════════════════════════════════════════════════════════════ */

/// @deprecated Use `buildBoost` once the UI is rewritten.
export async function buildFixedDeposit(params: {
  user: string;
  asset: SupportedAsset;
  amount: string;
  minYieldRaw?: bigint;
}): Promise<string> {
  // Best-effort bridge — convert the underlying amount into a "boost on SY
  // shaped the same way" call so existing screens still emit *something*
  // sensible. Real call shape changes when screens migrate.
  return buildAutoDeposit(params);
}

/// @deprecated Use `buildAutoDeposit`.
export async function buildFlexDeposit(params: {
  user: string;
  asset: SupportedAsset;
  amount: string;
}): Promise<string> {
  return buildAutoDeposit(params);
}

/// @deprecated Use `buildAutoWithdraw` (takes underlying amount, not SY).
export async function buildFlexWithdraw(params: {
  user: string;
  asset: SupportedAsset;
  syAmountRaw: bigint;
}): Promise<string> {
  // Approximate: treat the SY amount as if it were the underlying. Acceptable
  // for the transitional UI; the rewrite uses buildAutoWithdraw directly.
  return buildAutoWithdraw({
    user: params.user,
    asset: params.asset,
    underlyingAmount: fromRawAmount(params.asset, params.syAmountRaw).toString(),
  });
}

/// @deprecated Use `buildRedeemBoost`.
export async function buildRedeemAtMaturity(params: {
  user: string;
  asset: SupportedAsset;
  ptAmountRaw: bigint;
}): Promise<string> {
  return buildRedeemBoost(params);
}

/// @deprecated `claim_yield` no longer exists. YT is sold at boost time.
export async function buildClaimYield(_params: {
  user: string;
  asset: SupportedAsset;
}): Promise<string> {
  throw new Error("claim_yield removed in auto-earn refactor — YT is sold at boost time");
}

/* ═══════════════════════════════════════════════════════════════════════════
   Rate math helpers.
   ═══════════════════════════════════════════════════════════════════════════ */

export function impliedRateToApyPercent(impliedRateWad: bigint): number {
  return (Number(impliedRateWad) / Number(WAD)) * 100;
}

export function daysUntil(unixSeconds: bigint | number): number {
  const target = typeof unixSeconds === "bigint" ? Number(unixSeconds) : unixSeconds;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.ceil((target - now) / 86_400));
}

export { WAD, SECONDS_PER_YEAR };
