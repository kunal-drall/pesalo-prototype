import { FeeBumpTransaction, TransactionBuilder } from "@stellar/stellar-sdk";

import {
  CHANNELS_API_KEY,
  CHANNELS_BASE_URL,
  STELLAR_TESTNET_PASSPHRASE,
} from "@/lib/utils/constants";

/// OpenZeppelin Stellar Channels (https://docs.openzeppelin.com/relayer/channels)
/// replaces SDF's deprecated Launchtube. The relayer pays the network fee, runs
/// simulation, and submits the Soroban call against a managed channel-account
/// pool. We post the host function and signed auth entries separately, exactly
/// matching the documented `submitSorobanTransaction({ func, auth })` contract.

const SUBMIT_PATH = "/v1/soroban/transactions";

export type SubmissionParts = {
  /// Base64 XDR of `xdr.HostFunction`.
  func: string;
  /// Base64 XDR of each `xdr.SorobanAuthorizationEntry` (already signed by passkey-kit).
  auth: string[];
};

export type ChannelsReceipt = {
  hash: string;
  ledger?: number;
  envelopeXdr?: string;
  resultXdr?: string;
  resultMetaXdr?: string;
};

/// Decompose a passkey-signed Soroban envelope into the parts Channels expects.
/// passkey-kit signs in place (it modifies auth entries on the operation); the
/// host function never needs signing. So we read both from the envelope.
export function extractInvocationParts(
  signedXdr: string,
  networkPassphrase: string = STELLAR_TESTNET_PASSPHRASE,
): SubmissionParts {
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  if (tx instanceof FeeBumpTransaction) {
    throw new Error("Channels cannot submit a fee-bump envelope");
  }
  if (tx.operations.length !== 1) {
    throw new Error("Channels expects a single invokeHostFunction operation");
  }
  const op = tx.operations[0];
  if (op.type !== "invokeHostFunction") {
    throw new Error(`Channels only handles invokeHostFunction ops (got ${op.type})`);
  }
  return {
    func: op.func.toXDR("base64"),
    auth: (op.auth ?? []).map((entry) => entry.toXDR("base64")),
  };
}

/// Submit pre-signed host function + auth entries via Channels. Returns the
/// canonical Stellar transaction hash for downstream polling.
export async function submitSorobanCall(parts: SubmissionParts): Promise<ChannelsReceipt> {
  if (!CHANNELS_API_KEY) {
    throw new Error(
      "OpenZeppelin Channels API key missing. Set EXPO_PUBLIC_CHANNELS_API_KEY " +
        "(testnet keys at https://channels.openzeppelin.com/testnet/gen).",
    );
  }
  if (!CHANNELS_BASE_URL) {
    throw new Error("Channels base URL is unset");
  }

  const response = await fetch(`${CHANNELS_BASE_URL}${SUBMIT_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${CHANNELS_API_KEY}`,
    },
    body: JSON.stringify({ func: parts.func, auth: parts.auth }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Channels ${response.status}: ${text || response.statusText}`);
  }

  const payload = (await response.json()) as {
    hash?: string;
    ledger?: number;
    envelopeXdr?: string;
    resultXdr?: string;
    resultMetaXdr?: string;
    error?: string;
  };

  if (payload.error) {
    throw new Error(`Channels submission failed: ${payload.error}`);
  }
  if (!payload.hash) {
    throw new Error("Channels response missing transaction hash");
  }

  return {
    hash: payload.hash,
    ledger: payload.ledger,
    envelopeXdr: payload.envelopeXdr,
    resultXdr: payload.resultXdr,
    resultMetaXdr: payload.resultMetaXdr,
  };
}
