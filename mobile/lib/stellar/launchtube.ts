import { DEFAULT_LAUNCHTUBE_URL } from "@/lib/utils/constants";
import { TxResult } from "@/lib/stellar/types";

export async function submitSponsoredTransaction(signedXdr: string): Promise<TxResult> {
  const response = await fetch(DEFAULT_LAUNCHTUBE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ xdr: signedXdr })
  });

  if (!response.ok) {
    throw new Error("Unable to submit sponsored transaction");
  }

  const payload = (await response.json()) as { hash?: string };
  return {
    hash: payload.hash ?? signedXdr.slice(0, 64),
    status: "pending"
  };
}
