import { Keypair, authorizeEntry, xdr } from "@stellar/stellar-sdk";

import { getSecureItem, setSecureItem } from "@/lib/storage/secure";
import { STELLAR_TESTNET_PASSPHRASE } from "@/lib/utils/constants";

/// Storage key for the locally-generated Ed25519 session signer secret.
/// This key is scoped on the smart wallet to only call Router.auto_deposit
/// and Router.auto_withdraw — its blast radius is bounded by the contract
/// rules, not by how well we hide the bytes.
const SESSION_SECRET_KEY = "autoEarnSessionSecret";
const SESSION_PUBLIC_KEY = "autoEarnSessionPublic";

export type SessionKeyMaterial = {
  /// Stellar G… address of the session key (public).
  publicKey: string;
  /// Raw 32-byte Ed25519 public key, base64.
  rawPublicKeyBase64: string;
};

/// Look up the existing session key, if one has been registered.
export async function getSessionKey(): Promise<SessionKeyMaterial | null> {
  const secret = await getSecureItem(SESSION_SECRET_KEY);
  const publicKey = await getSecureItem(SESSION_PUBLIC_KEY);
  if (!secret || !publicKey) return null;
  return {
    publicKey,
    rawPublicKeyBase64: Keypair.fromSecret(secret).rawPublicKey().toString("base64"),
  };
}

/// Generate a fresh Ed25519 session key. Persists the secret to the
/// device's Keychain / EncryptedSharedPrefs via expo-secure-store. Returns
/// the public material the caller needs to register the key as a signer
/// on the smart wallet (still requires Face ID to add).
export async function createSessionKey(): Promise<SessionKeyMaterial> {
  const kp = Keypair.random();
  await setSecureItem(SESSION_SECRET_KEY, kp.secret());
  await setSecureItem(SESSION_PUBLIC_KEY, kp.publicKey());
  return {
    publicKey: kp.publicKey(),
    rawPublicKeyBase64: kp.rawPublicKey().toString("base64"),
  };
}

/// Forget the session key — the on-chain signer must be removed separately
/// via `wallet.remove_signer(publicKey)` (one Face ID prompt).
export async function forgetSessionKey(): Promise<void> {
  await setSecureItem(SESSION_SECRET_KEY, "");
  await setSecureItem(SESSION_PUBLIC_KEY, "");
}

/// Sign a Soroban auth entry with the stored session key. Used by the
/// auto-deposit watcher when it builds an auto_deposit transaction — the
/// resulting signed entry can be submitted via OZ Channels without ever
/// prompting the user.
///
/// Throws if no session key is registered (caller should funnel users back
/// through the agreement screen first).
export async function signAuthEntryWithSession(
  entry: xdr.SorobanAuthorizationEntry,
  validUntilLedger: number,
  networkPassphrase: string = STELLAR_TESTNET_PASSPHRASE,
): Promise<xdr.SorobanAuthorizationEntry> {
  const secret = await getSecureItem(SESSION_SECRET_KEY);
  if (!secret) {
    throw new Error(
      "No session key registered. Have the user accept auto-earn first.",
    );
  }
  const kp = Keypair.fromSecret(secret);
  return authorizeEntry(entry, kp, validUntilLedger, networkPassphrase);
}
