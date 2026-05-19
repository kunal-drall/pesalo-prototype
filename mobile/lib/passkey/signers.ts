import { Buffer } from "buffer";

import { Client as PasskeyContractClient, type Signer } from "passkey-kit-sdk";
import { Keypair } from "@stellar/stellar-sdk";

import { signTransaction } from "@/lib/passkey";
import {
  extractInvocationParts,
  submitSorobanCall,
} from "@/lib/stellar/channels";
import { stellarClient } from "@/lib/stellar/client";
import { CONTRACTS, DEFAULT_RPC_URL, STELLAR_TESTNET_PASSPHRASE } from "@/lib/utils/constants";

/// Build the Signer payload for an Ed25519 session key scoped to the Router
/// contract. The wallet's __check_auth will accept signatures from this key
/// only when authorizing a Router invocation. Every other context — token
/// transfers to arbitrary addresses, calls to other Stellar contracts —
/// requires a fresh passkey signature.
export function sessionSigner(rawPublicKeyBase64: string): Signer {
  if (!CONTRACTS.router) {
    throw new Error("Router contract address not configured");
  }
  const rawKey = Buffer.from(rawPublicKeyBase64, "base64");
  if (rawKey.length !== 32) {
    throw new Error(`Ed25519 public key must be 32 bytes (got ${rawKey.length})`);
  }
  return {
    tag: "Ed25519",
    values: [
      rawKey,
      // SignerExpiration(None) — never expires; user revokes manually.
      [undefined],
      // SignerLimits(Some({ Router: None })) — full Router access, no
      // additional co-signers required. The Router only exposes user-fund
      // operations on the caller's own SY/PT positions, so this is the
      // tightest scope the smart-wallet's limit model lets us express.
      [new Map([[CONTRACTS.router, undefined]])],
      { tag: "Persistent", values: undefined },
    ],
  };
}

/// Register the given Ed25519 signer on the user's smart wallet. Requires a
/// Face ID prompt (the passkey-signed transaction is what authorizes the
/// add_signer call). Returns the Stellar tx hash.
export async function addSignerToWallet(opts: {
  walletAddress: string;
  signer: Signer;
}): Promise<string> {
  const client = new PasskeyContractClient({
    contractId: opts.walletAddress,
    rpcUrl: DEFAULT_RPC_URL,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    publicKey: opts.walletAddress,
  });
  const at = await client.add_signer({ signer: opts.signer });
  const unsignedXdr = at.toXDR();
  const signedXdr = await signTransaction(unsignedXdr);
  const parts = extractInvocationParts(signedXdr, stellarClient.networkPassphrase);
  const receipt = await submitSorobanCall(parts);
  if (!receipt.hash) {
    throw new Error(`Channels returned no hash for add_signer (status=${receipt.status ?? "?"})`);
  }
  return receipt.hash;
}

/// Remove a session key from the smart wallet — used by the
/// "stop auto-earning" flow. One Face ID prompt.
export async function removeSignerFromWallet(opts: {
  walletAddress: string;
  publicKey: string;
}): Promise<string> {
  const client = new PasskeyContractClient({
    contractId: opts.walletAddress,
    rpcUrl: DEFAULT_RPC_URL,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    publicKey: opts.walletAddress,
  });
  const rawKey = Keypair.fromPublicKey(opts.publicKey).rawPublicKey();
  const at = await client.remove_signer({
    signer_key: { tag: "Ed25519", values: [rawKey] },
  });
  const unsignedXdr = at.toXDR();
  const signedXdr = await signTransaction(unsignedXdr);
  const parts = extractInvocationParts(signedXdr, stellarClient.networkPassphrase);
  const receipt = await submitSorobanCall(parts);
  if (!receipt.hash) {
    throw new Error(`Channels returned no hash for remove_signer (status=${receipt.status ?? "?"})`);
  }
  return receipt.hash;
}
