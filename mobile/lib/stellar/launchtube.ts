import {
  DEFAULT_LAUNCHTUBE_URL,
  LAUNCHTUBE_TOKEN,
} from "@/lib/utils/constants";

export type LaunchtubeReceipt = {
  hash: string;
  ledger?: number;
  envelopeXdr?: string;
  resultXdr?: string;
  resultMetaXdr?: string;
};

/// Submit a signed Soroban transaction to Launchtube. Launchtube wraps the
/// transaction in a fee-bump (it pays gas) and submits to Stellar core. We
/// surface the canonical hash so callers can poll the chain for finality.
export async function submitSponsoredTransaction(
  signedXdr: string,
): Promise<LaunchtubeReceipt> {
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };
  if (LAUNCHTUBE_TOKEN) {
    headers["authorization"] = `Bearer ${LAUNCHTUBE_TOKEN}`;
  }

  const body = new URLSearchParams({ xdr: signedXdr }).toString();
  const response = await fetch(DEFAULT_LAUNCHTUBE_URL, { method: "POST", headers, body });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Launchtube ${response.status}: ${text || response.statusText}`);
  }

  const payload = (await response.json()) as {
    hash?: string;
    ledger?: number;
    envelopeXdr?: string;
    resultXdr?: string;
    resultMetaXdr?: string;
    errorResultXdr?: string;
  };

  if (payload.errorResultXdr) {
    throw new Error(`Launchtube transaction failed: ${payload.errorResultXdr}`);
  }
  if (!payload.hash) {
    throw new Error("Launchtube response missing transaction hash");
  }

  return {
    hash: payload.hash,
    ledger: payload.ledger,
    envelopeXdr: payload.envelopeXdr,
    resultXdr: payload.resultXdr,
    resultMetaXdr: payload.resultMetaXdr,
  };
}
