import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import { readDevKeypair } from "@/lib/stellar/devAccount";
import { stellarClient } from "@/lib/stellar/client";
import {
  DEFAULT_HORIZON_URL,
  STELLAR_TESTNET_PASSPHRASE,
  SupportedAsset,
} from "@/lib/utils/constants";

/// Classic Stellar payments + DEX swaps for the dev keypair path. Uses
/// Horizon directly — Soroban contract calls and the OZ Channels relayer
/// are only required for passkey smart-wallet flows.

/// Circle's well-known testnet issuers. These are the only USDC/EURC
/// asset codes our Send/Swap flows recognise; transfers in/out of other
/// issuers' anchor assets aren't surfaced in the UI.
export const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const TESTNET_EURC_ISSUER = "GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO";

const horizon = new Horizon.Server(DEFAULT_HORIZON_URL, { allowHttp: false });

export function assetFor(symbol: SupportedAsset): Asset {
  if (symbol === "XLM") return Asset.native();
  if (symbol === "USDC") return new Asset("USDC", TESTNET_USDC_ISSUER);
  return new Asset("EURC", TESTNET_EURC_ISSUER);
}

const networkPassphrase = Networks.TESTNET ?? STELLAR_TESTNET_PASSPHRASE;

/// True when the account already trusts the given non-native asset.
export async function hasTrustline(account: string, asset: SupportedAsset): Promise<boolean> {
  if (asset === "XLM") return true;
  try {
    const acct = await horizon.loadAccount(account);
    const code = asset;
    const issuer = asset === "USDC" ? TESTNET_USDC_ISSUER : TESTNET_EURC_ISSUER;
    return acct.balances.some(
      (b) =>
        (b.asset_type === "credit_alphanum4" || b.asset_type === "credit_alphanum12") &&
        b.asset_code === code &&
        b.asset_issuer === issuer,
    );
  } catch {
    return false;
  }
}

/// Build a `change_trust` Transaction. The object stays in this module
/// so we never go through an XDR string — multiple stellar-base
/// installs in node_modules can diverge on XDR enum tags otherwise.
export async function buildAddTrustline(
  source: string,
  asset: Exclude<SupportedAsset, "XLM">,
): Promise<Transaction> {
  const account = await horizon.loadAccount(source);
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset: assetFor(asset) }))
    .setTimeout(180)
    .build();
}

/// Build a classic `payment` Transaction. Use `buildSwap` instead when
/// the source and destination assets differ.
export async function buildClassicPayment(params: {
  from: string;
  to: string;
  asset: SupportedAsset;
  amount: string;
}): Promise<Transaction> {
  const account = await horizon.loadAccount(params.from);
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: params.to,
        asset: assetFor(params.asset),
        amount: params.amount,
      }),
    )
    .setTimeout(180)
    .build();
}

/// Build a strict-send path-payment Transaction. `path` is the
/// intermediate hops as returned by `findStrictSendPath` — pass [] for
/// a direct swap when the DEX has direct liquidity.
export async function buildSwap(params: {
  source: string;
  sendAsset: SupportedAsset;
  sendAmount: string;
  destAsset: SupportedAsset;
  minDestAmount: string;
  path?: SupportedAsset[];
}): Promise<Transaction> {
  const account = await horizon.loadAccount(params.source);
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        destination: params.source,
        sendAsset: assetFor(params.sendAsset),
        sendAmount: params.sendAmount,
        destAsset: assetFor(params.destAsset),
        destMin: params.minDestAmount,
        path: (params.path ?? []).map(assetFor),
      }),
    )
    .setTimeout(180)
    .build();
}

/// Sign a Transaction with the on-device dev keypair and submit it to
/// Horizon. We POST the base64 XDR over plain fetch instead of going
/// through `horizon.submitTransaction(tx)` because that helper does the
/// XDR serialization internally — and the multiple `@stellar/stellar-
/// base` installs in node_modules can serialize the envelope tag in a
/// way the SDK on the other end of the helper can't read back. Going
/// through `tx.toXDR()` once here is the same XDR Horizon's Go server
/// parses, so we sidestep the cross-module envelope confusion.
export async function signAndSubmitClassic(tx: Transaction): Promise<{
  hash: string;
  ledger: number;
}> {
  const kp = await readDevKeypair();
  if (!kp) {
    throw new Error(
      "No on-device keypair. Classic Stellar tx signing requires a dev keypair " +
        "(passkey smart-wallet path uses signTransaction in lib/passkey).",
    );
  }
  tx.sign(kp);

  // Manually base64-encode the envelope bytes via btoa(). The SDK's
  // `Transaction.toXDR()` and `xdr.TransactionEnvelope.toXDR("base64")`
  // both internally call `.toString("base64")` on what they assume is a
  // Node Buffer — but in our RN bundle (multiple stellar-base copies
  // colliding in node_modules) it's a plain Uint8Array, whose
  // `toString()` ignores the argument and returns the comma-separated
  // decimal byte list ("0,0,0,2,0,0,..."). Going via btoa(), which
  // every RN/Hermes runtime has natively, sidesteps the broken Buffer
  // prototype chain entirely.
  const envelopeBytes: Uint8Array = tx.toEnvelope().toXDR() as unknown as Uint8Array;
  const xdr = bytesToBase64(envelopeBytes);

  const res = await fetch(`${DEFAULT_HORIZON_URL.replace(/\/$/, "")}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `tx=${encodeURIComponent(xdr)}`,
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new Error(describeHorizonError({ response: { data: body } }));
  }

  const ok = body as { hash?: string; ledger?: number };
  if (!ok.hash) {
    throw new Error("Horizon accepted the transaction but returned no hash.");
  }
  return { hash: ok.hash, ledger: ok.ledger ?? 0 };
}

/// Distil the human-meaningful reason out of an axios/Horizon error so
/// the UI can show it instead of "Request failed with status code 400".
/// Horizon embeds the per-operation rejection codes under
/// `response.data.extras.result_codes`.
function describeHorizonError(err: unknown): string {
  const e = err as {
    message?: string;
    response?: {
      data?: {
        title?: string;
        detail?: string;
        extras?: {
          result_codes?: {
            transaction?: string;
            operations?: string[];
          };
          envelope_xdr?: string;
        };
      };
    };
  };
  const codes = e?.response?.data?.extras?.result_codes;
  if (codes) {
    const op = codes.operations?.find((c) => c && c !== "op_success");
    if (op) return horizonCodeMessage(op);
    if (codes.transaction && codes.transaction !== "tx_success") {
      return horizonCodeMessage(codes.transaction);
    }
  }
  const title = e?.response?.data?.title;
  const detail = e?.response?.data?.detail;
  if (detail) return detail;
  if (title) return title;
  return e?.message ?? "Stellar rejected the transaction.";
}

/// Translate the most common per-operation rejection codes into copy a
/// user can act on. Falls back to the raw code when we don't have a
/// friendlier phrasing.
function horizonCodeMessage(code: string): string {
  const map: Record<string, string> = {
    op_underfunded: "Not enough funds for this transaction.",
    op_no_trust: "The destination asset isn't trusted yet — add a trustline first.",
    op_no_destination: "The destination account doesn't exist on testnet yet.",
    op_line_full: "The destination is at its trustline limit.",
    op_no_issuer: "The asset issuer doesn't exist on testnet.",
    op_too_few_offers: "Not enough DEX liquidity for this swap right now.",
    op_offer_cross_self: "Can't route through your own offers.",
    op_low_reserve: "Not enough XLM to satisfy the base reserve. Top up via Friendbot.",
    op_invalid_limit: "Trustline limit is invalid.",
    op_under_dest_min: "Price moved against you past the slippage limit. Try again.",
    tx_bad_seq: "Transaction sequence got out of date. Try again.",
    tx_insufficient_balance: "Not enough XLM to pay the fee.",
    tx_no_source_account: "Source account doesn't exist on testnet.",
    tx_failed: "Stellar rejected the transaction.",
  };
  return map[code] ?? `Stellar rejected the transaction (${code}).`;
}

export type PaymentPath = {
  destAmount: string;
  sourceAmount: string;
  path: SupportedAsset[];
};

/// Query Horizon's path-finding service for the best price route between
/// two assets. Returns the most generous destination amount across all
/// paths so the UI can show the realistic rate.
export async function findStrictSendPath(params: {
  sourceAccount: string;
  sendAsset: SupportedAsset;
  sendAmount: string;
  destAsset: SupportedAsset;
}): Promise<PaymentPath | null> {
  const send = assetFor(params.sendAsset);
  const dest = assetFor(params.destAsset);
  try {
    const records = await horizon
      .strictSendPaths(send, params.sendAmount, [dest])
      .call();
    const best = records.records[0];
    if (!best) return null;
    return {
      destAmount: best.destination_amount,
      sourceAmount: best.source_amount,
      path: (best.path ?? [])
        .map((hop) => assetSymbol(hop))
        .filter((s): s is SupportedAsset => s !== null),
    };
  } catch {
    return null;
  }
}

function assetSymbol(hop: { asset_type: string; asset_code?: string }): SupportedAsset | null {
  if (hop.asset_type === "native") return "XLM";
  if (hop.asset_code === "USDC") return "USDC";
  if (hop.asset_code === "EURC") return "EURC";
  return null;
}

void stellarClient; // keep import for symmetry with other stellar libs
void Keypair; // referenced by the public function signatures via Transaction

/// Convert raw bytes to a base64 string via `btoa`. Sidesteps the npm
/// `buffer` polyfill's bad Buffer prototype in our RN bundle.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  // Build a binary string one char per byte. Chunked because passing a
  // huge typed array to String.fromCharCode(...spread) can blow the stack.
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  // `btoa` is available globally on every modern JS runtime (Hermes,
  // V8, JSC). It throws on non-Latin1 input — by construction we only
  // give it byte-range char codes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as unknown as { btoa: (s: string) => string }).btoa(binary);
}
