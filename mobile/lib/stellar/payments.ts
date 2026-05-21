import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

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

/// Build a `change_trust` operation that adds a trustline for the given
/// asset. Required before classic accounts can receive USDC/EURC.
export async function buildAddTrustline(
  source: string,
  asset: Exclude<SupportedAsset, "XLM">,
): Promise<string> {
  const account = await horizon.loadAccount(source);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset: assetFor(asset) }))
    .setTimeout(180)
    .build();
  return tx.toXDR();
}

/// Build a classic `payment` operation. Use `buildSwap` instead when
/// the source and destination assets differ.
export async function buildClassicPayment(params: {
  from: string;
  to: string;
  asset: SupportedAsset;
  amount: string;
}): Promise<string> {
  const account = await horizon.loadAccount(params.from);
  const tx = new TransactionBuilder(account, {
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
  return tx.toXDR();
}

/// Build a strict-send path-payment that swaps `sendAmount` of `from` for
/// at least `minDestAmount` of `to`. `path` is the intermediate hops as
/// returned by `findStrictSendPath` — pass [] for a direct swap when the
/// DEX has direct liquidity.
export async function buildSwap(params: {
  source: string;
  sendAsset: SupportedAsset;
  sendAmount: string;
  destAsset: SupportedAsset;
  minDestAmount: string;
  path?: SupportedAsset[];
}): Promise<string> {
  const account = await horizon.loadAccount(params.source);
  const tx = new TransactionBuilder(account, {
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
  return tx.toXDR();
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

/// Submit a signed Stellar Operation tx via Horizon. Soroban contract
/// transactions go through the Channels relayer instead — see
/// `lib/stellar/channels.ts`.
export async function submitClassicTx(signedXdr: string): Promise<{
  hash: string;
  ledger: number;
}> {
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const result = await horizon.submitTransaction(tx);
  return { hash: result.hash, ledger: result.ledger };
}

void stellarClient; // keep import for symmetry with other stellar libs
