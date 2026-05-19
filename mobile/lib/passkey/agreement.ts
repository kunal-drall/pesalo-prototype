import { getSecureItem, setSecureItem } from "@/lib/storage/secure";
import { createSessionKey, forgetSessionKey, getSessionKey } from "@/lib/passkey/session";

/// Local flag — true once the user has agreed to auto-earn AND we've
/// confirmed the session signer is registered on chain. We treat the
/// on-chain confirmation as the source of truth; this flag is just a
/// fast-path so we don't simulate the wallet on every app boot.
const AGREEMENT_KEY = "autoEarnAgreed";
const AGREED_AT_KEY = "autoEarnAgreedAt";

export type AgreementState =
  | { kind: "uninitialized" }
  /// User has not seen the terms screen yet (or declined).
  | { kind: "needs-consent" }
  /// User said yes; we generated a session key locally; pending the on-chain
  /// add_signer call (the next step needs a Face ID prompt).
  | { kind: "session-key-pending" }
  /// Fully active — the session key is registered on the smart wallet and
  /// the auto-earn watcher can start polling.
  | { kind: "active"; sessionPublicKey: string; agreedAt: string };

export async function getAgreementState(): Promise<AgreementState> {
  const agreed = await getSecureItem(AGREEMENT_KEY);
  if (agreed !== "true") {
    // Session-key generated but not confirmed on chain?
    const pending = await getSessionKey();
    return pending ? { kind: "session-key-pending" } : { kind: "needs-consent" };
  }
  const session = await getSessionKey();
  if (!session) {
    // Local flag says agreed but no session secret — likely a partial
    // re-install. Roll back to needs-consent so the flow runs cleanly.
    await setSecureItem(AGREEMENT_KEY, "");
    return { kind: "needs-consent" };
  }
  const agreedAt = (await getSecureItem(AGREED_AT_KEY)) ?? new Date().toISOString();
  return { kind: "active", sessionPublicKey: session.publicKey, agreedAt };
}

/// Step 1 of the agreement flow: user tapped "I agree" — generate a
/// fresh session key locally. No network calls; safe to call without
/// passkey auth. The caller now needs to register the key on the smart
/// wallet (a Face ID prompt).
export async function acceptAgreement(): Promise<{ sessionPublicKey: string }> {
  const session = await getSessionKey();
  if (session) return { sessionPublicKey: session.publicKey };
  const fresh = await createSessionKey();
  return { sessionPublicKey: fresh.publicKey };
}

/// Step 2: caller confirms the on-chain add_signer transaction succeeded.
/// Flips the local fast-path flag so future boots short-circuit.
export async function confirmAgreement(): Promise<void> {
  await setSecureItem(AGREEMENT_KEY, "true");
  await setSecureItem(AGREED_AT_KEY, new Date().toISOString());
}

/// Tear down: forget the local session key (caller is responsible for
/// the on-chain `remove_signer` Face ID transaction).
export async function revokeAgreement(): Promise<void> {
  await setSecureItem(AGREEMENT_KEY, "");
  await setSecureItem(AGREED_AT_KEY, "");
  await forgetSessionKey();
}
