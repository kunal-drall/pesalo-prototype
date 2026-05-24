import {
  acceptAgreement,
  confirmAgreement,
  revokeAgreement,
} from "@/lib/passkey/agreement";
import {
  addSignerToWallet,
  removeSignerFromWallet,
  sessionSigner,
} from "@/lib/passkey/signers";
import {
  forgetSessionKey,
  getSessionKey,
} from "@/lib/passkey/session";

/// One-shot "Enable auto-earn" flow. The future agreement screen calls this
/// after the user taps "I agree" — it:
///   1. Generates an Ed25519 session keypair locally.
///   2. Asks the smart wallet to add it as a scoped signer (one Face ID).
///   3. Confirms the agreement in local secure storage.
///
/// The next time the user opens the app, the auto-earn watcher picks up
/// `agreement.kind === "active"` and starts the silent deposit loop.
export async function enableAutoEarn(opts: {
  walletAddress: string;
}): Promise<{ sessionPublicKey: string; hash: string }> {
  // Step 1: generate session key (no auth needed; pure local).
  const { sessionPublicKey } = await acceptAgreement();
  const session = await getSessionKey();
  if (!session) {
    throw new Error("Session key generation failed");
  }

  // Step 2: add it to the wallet (Face ID prompt happens inside).
  let hash: string;
  try {
    hash = await addSignerToWallet({
      walletAddress: opts.walletAddress,
      signer: sessionSigner(session.rawPublicKeyBase64),
    });
  } catch (err) {
    // Roll back local state so the user can retry cleanly.
    await forgetSessionKey();
    throw err;
  }

  // Step 3: mark the agreement active so subsequent boots short-circuit.
  await confirmAgreement();
  return { sessionPublicKey, hash };
}

/// One-shot "Stop auto-earning" — removes the signer from the wallet
/// (one Face ID) and clears local state. Existing on-chain positions stay
/// where they are; only the silent-deposit pipeline is torn down.
export async function disableAutoEarn(opts: {
  walletAddress: string;
}): Promise<{ hash: string | null }> {
  const session = await getSessionKey();
  if (!session) {
    await revokeAgreement();
    return { hash: null };
  }
  const hash = await removeSignerFromWallet({
    walletAddress: opts.walletAddress,
    publicKey: session.publicKey,
  });
  await revokeAgreement();
  return { hash };
}
