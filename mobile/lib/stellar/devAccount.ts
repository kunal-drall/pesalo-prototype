import { Keypair } from "@stellar/stellar-sdk/minimal";

import { getSecureItem, setSecureItem, deleteSecureItem } from "@/lib/storage/secure";

/// Dev-mode Stellar account. iOS Simulator can't reliably run WebAuthn,
/// and our passkey-bound smart wallet contracts require Apple Developer
/// signed associated domains we don't have on dev. This module gives us
/// a Stellar Ed25519 keypair stored in SecureStore so the rest of the
/// app (balances, send, receive, activity) can run end-to-end against
/// testnet without the passkey dependency.
///
/// Limitations: a plain G-address can't call our Router contract — Boost
/// and Auto-Earn deposits stay disabled on these accounts. Mainnet must
/// go through PasskeyKit.

const DEV_SECRET_KEY = "pesalo-dev-secret";
const DEV_ADDRESS_KEY = "pesalo-dev-address";

export async function readDevKeypair(): Promise<Keypair | null> {
  const secret = await getSecureItem(DEV_SECRET_KEY);
  if (!secret) return null;
  try {
    return Keypair.fromSecret(secret);
  } catch {
    // Stored value isn't a valid Stellar secret — clear it so the next
    // create flow generates a fresh one rather than looping on bad data.
    await deleteSecureItem(DEV_SECRET_KEY);
    await deleteSecureItem(DEV_ADDRESS_KEY);
    return null;
  }
}

export async function readDevAddress(): Promise<string | null> {
  return getSecureItem(DEV_ADDRESS_KEY);
}

export async function createDevKeypair(): Promise<Keypair> {
  const kp = Keypair.random();
  await setSecureItem(DEV_SECRET_KEY, kp.secret());
  await setSecureItem(DEV_ADDRESS_KEY, kp.publicKey());
  return kp;
}

export async function clearDevKeypair(): Promise<void> {
  await deleteSecureItem(DEV_SECRET_KEY);
  await deleteSecureItem(DEV_ADDRESS_KEY);
}
