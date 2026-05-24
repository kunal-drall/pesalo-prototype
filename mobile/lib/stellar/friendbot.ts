/// Stellar testnet Friendbot integration. Friendbot is the testnet's
/// public faucet — POSTing a Stellar address to it creates the account
/// on-chain and funds it with 10_000 XLM. Mainnet has no equivalent;
/// callers must guard against using this in prod.

const FRIENDBOT_URL = "https://friendbot.stellar.org";

/// Returns true when funding succeeded (HTTP 200) OR the account is
/// already funded (HTTP 400 with the "createAccountAlreadyExist" code,
/// which Friendbot returns for accounts that exist on testnet).
export async function fundWithFriendbot(address: string): Promise<{
  ok: boolean;
  alreadyFunded: boolean;
  message?: string;
}> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`, {
    method: "GET",
  });

  if (res.ok) {
    return { ok: true, alreadyFunded: false };
  }

  // Friendbot returns 400 with a JSON error body. Distinguish "already
  // funded" from real failures because the former is benign on retries.
  try {
    const body = await res.json();
    const code: string | undefined = body?.extras?.result_codes?.operations?.[0];
    const detail: string | undefined = body?.detail ?? body?.title;
    const alreadyFunded =
      code === "op_already_exists" ||
      (typeof detail === "string" && /already.*exist/i.test(detail));
    return { ok: alreadyFunded, alreadyFunded, message: detail ?? String(res.status) };
  } catch {
    return {
      ok: false,
      alreadyFunded: false,
      message: `Friendbot returned ${res.status}`,
    };
  }
}
