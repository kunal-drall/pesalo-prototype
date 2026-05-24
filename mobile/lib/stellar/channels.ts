import { FeeBumpTransaction, TransactionBuilder } from "@stellar/stellar-sdk";

import {
  CHANNELS_API_KEY,
  CHANNELS_BASE_URL,
  STELLAR_TESTNET_PASSPHRASE,
} from "@/lib/utils/constants";

/// OpenZeppelin Stellar Channels (the OZ Relayer's Channels plugin) replaces
/// SDF's deprecated Launchtube. The relayer pays network fees, simulates the
/// transaction, and submits via a managed channel-account pool. We post the
/// host function and signed auth entries separately, matching the documented
/// `submitSorobanTransaction({ func, auth })` contract from
/// @openzeppelin/relayer-plugin-channels.
///
/// Endpoint: POST <baseUrl>/  with `{ params: { func, auth, skipWait? } }`.
/// Response: `{ success, data: { transactionId, hash, status }, error?, metadata? }`.

export type SubmissionParts = {
  /// Base64 XDR of `xdr.HostFunction`.
  func: string;
  /// Base64 XDR of each `xdr.SorobanAuthorizationEntry` (already signed by passkey-kit).
  auth: string[];
};

export type ChannelsReceipt = {
  /// Canonical Stellar transaction hash. Always present for mutating calls;
  /// null when Channels detects a read-only call (rare in production flow).
  hash: string | null;
  /// Relayer-side transaction id, useful for support tickets.
  transactionId?: string | null;
  /// One of: "pending", "submitted", "success", "readonly", etc.
  status?: string | null;
  /// Set only when Channels detected the call was read-only and returned
  /// the simulated ScVal directly.
  returnValue?: string;
  /// Latest ledger Channels observed during simulation. Useful for polling.
  latestLedger?: number;
};

/// Decompose a passkey-signed Soroban envelope into the parts Channels expects.
/// passkey-kit signs in place (it mutates auth entries on the operation); the
/// host function never needs signing.
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

/// Submit pre-signed host function + auth entries via OZ Channels. Returns
/// the canonical Stellar transaction hash for downstream polling.
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

  // The Channels plugin lives at the baseUrl's root path; the SDK does
  // axios.post('/', { params }) which resolves to baseUrl with a trailing slash.
  const endpoint = CHANNELS_BASE_URL.endsWith("/") ? CHANNELS_BASE_URL : `${CHANNELS_BASE_URL}/`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${CHANNELS_API_KEY}`,
    },
    body: JSON.stringify({
      params: { func: parts.func, auth: parts.auth },
    }),
  });

  let payload: ChannelsEnvelope;
  try {
    payload = (await response.json()) as ChannelsEnvelope;
  } catch {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Channels ${response.status}: non-JSON response — ${text}`);
  }

  if (payload.success === false) {
    const message =
      payload.error ||
      payload.data?.details?.message ||
      `Channels ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  // Channels recognises read-only invocations and returns the simulated
  // ScVal without submitting. For mutating user actions we always expect a
  // hash — the caller should treat hash:null as a logical error in that
  // context. The receipt always includes `status` so callers can branch.
  const data = payload.data ?? {};
  return {
    hash: data.hash ?? null,
    transactionId: data.transactionId ?? null,
    status: data.status ?? null,
    returnValue: data.returnValue,
    latestLedger: data.latestLedger,
  };
}

type ChannelsEnvelope = {
  success: boolean;
  error?: string;
  data?: {
    transactionId?: string | null;
    hash?: string | null;
    status?: string | null;
    returnValue?: string;
    latestLedger?: number;
    code?: string;
    details?: { message?: string };
  };
};
