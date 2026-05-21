import { TransactionBuilder } from "@stellar/stellar-sdk/minimal";
import { create as createPasskey, get as getPasskey } from "react-native-passkeys";
import { PasskeyKit } from "passkey-kit";

import {
  CONTRACTS,
  DEFAULT_RPC_URL,
  PESALO_DOMAIN,
  STELLAR_TESTNET_PASSPHRASE,
} from "@/lib/utils/constants";
import { fundWithFriendbot } from "@/lib/stellar/friendbot";
import {
  createDevKeypair,
  readDevAddress,
  readDevKeypair,
  clearDevKeypair,
} from "@/lib/stellar/devAccount";
import { getSecureItem, setSecureItem, deleteSecureItem } from "@/lib/storage/secure";

const WALLET_ADDRESS_KEY = "walletAddress";
const CREDENTIAL_ID_KEY = "credentialId";

const webAuthnBridge: NonNullable<ConstructorParameters<typeof PasskeyKit>[0]["WebAuthn"]> = {
  async startRegistration({ optionsJSON }) {
    const credential = await createPasskey(
      optionsJSON as Parameters<typeof createPasskey>[0],
    );
    if (!credential) {
      throw new Error("Passkey creation was cancelled");
    }
    return credential;
  },
  async startAuthentication({ optionsJSON }) {
    const assertion = await getPasskey(optionsJSON as Parameters<typeof getPasskey>[0]);
    if (!assertion) {
      throw new Error("Passkey authentication was cancelled");
    }
    return assertion;
  },
};

let cachedKit: PasskeyKit | null = null;

/// Lazy-construct PasskeyKit so a misconfigured env throws on first use
/// rather than at module-load time (which would crash the whole app on boot).
function getKit(): PasskeyKit {
  if (cachedKit) return cachedKit;
  if (!CONTRACTS.passkeyWalletWasmHash) {
    throw new Error(
      "Passkey smart wallet WASM hash missing. Set EXPO_PUBLIC_PASSKEY_WALLET_HASH " +
        "(produced by scripts/deploy-passkey-wallet.sh).",
    );
  }
  cachedKit = new PasskeyKit({
    rpcUrl: DEFAULT_RPC_URL,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    walletWasmHash: CONTRACTS.passkeyWalletWasmHash,
    WebAuthn: webAuthnBridge,
  });
  return cachedKit;
}

/// Returns whichever wallet address is currently bound to the device —
/// passkey smart-wallet contract id first, dev Stellar G-address second.
export async function getWalletAddress(): Promise<string | null> {
  const passkeyAddr = await getSecureItem(WALLET_ADDRESS_KEY);
  if (passkeyAddr) return passkeyAddr;
  return readDevAddress();
}

/// Whether the on-device wallet is a passkey smart-wallet (vs. a plain
/// Stellar G-address). Smart wallet has access to the Router/Boost
/// contracts; G-addresses only get balances + Friendbot + send/receive.
export async function isPasskeyWallet(): Promise<boolean> {
  return (await getSecureItem(WALLET_ADDRESS_KEY)) !== null;
}

/// Create a new account. Tries the passkey path first because that's
/// the production identity model; falls back to a dev Stellar keypair
/// when WebAuthn isn't available (iOS Simulator, dev hardware without
/// biometrics, or when associated-domains aren't configured). Either
/// way, the account is funded by testnet Friendbot before returning so
/// the rest of the app sees real on-chain balances.
export async function createAccount(): Promise<{
  address: string;
  isPasskey: boolean;
  funded: boolean;
}> {
  // Passkey path. We swallow any failure and fall through to dev keypair
  // because there are too many environment-specific reasons the platform
  // refuses (no biometric enrolment, no associated-domains, Simulator…)
  // to enumerate. The dev path is clearly labelled in UI.
  if (CONTRACTS.passkeyWalletWasmHash) {
    try {
      const kit = getKit();
      const wallet = await kit.createWallet("Pesalo", "Pesalo Saver", {
        rpId: PESALO_DOMAIN,
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
      });
      await setSecureItem(CREDENTIAL_ID_KEY, wallet.keyIdBase64);
      await setSecureItem(WALLET_ADDRESS_KEY, wallet.contractId);
      // Smart wallet is a C-address; Friendbot only funds G-addresses.
      // The auto-earn flow funds the smart wallet via the deployer
      // separately, so we don't call Friendbot here.
      return { address: wallet.contractId, isPasskey: true, funded: false };
    } catch (err) {
      console.warn("[pesalo] passkey wallet creation failed, falling back to dev keypair:", err);
    }
  }

  // Dev path: random Stellar keypair → secure store → Friendbot fund.
  const kp = await createDevKeypair();
  const address = kp.publicKey();
  const result = await fundWithFriendbot(address);
  return { address, isPasskey: false, funded: result.ok };
}

export async function login(): Promise<string | null> {
  const walletAddress = await getSecureItem(WALLET_ADDRESS_KEY);
  if (walletAddress) {
    try {
      const kit = getKit();
      const credentialId = await getSecureItem(CREDENTIAL_ID_KEY);
      const wallet = await kit.connectWallet({
        rpId: PESALO_DOMAIN,
        keyId: credentialId ?? "any",
      });
      await setSecureItem(CREDENTIAL_ID_KEY, wallet.keyIdBase64);
      await setSecureItem(WALLET_ADDRESS_KEY, wallet.contractId || walletAddress);
      return wallet.contractId || walletAddress;
    } catch (err) {
      console.warn("[pesalo] passkey login failed, trying dev keypair:", err);
    }
  }
  // Dev keypair already in secure store — just return its address.
  return readDevAddress();
}

export async function signOut(): Promise<void> {
  await deleteSecureItem(WALLET_ADDRESS_KEY);
  await deleteSecureItem(CREDENTIAL_ID_KEY);
  await clearDevKeypair();
}

export async function signTransaction(unsignedXdr: string): Promise<string> {
  // If a passkey smart-wallet is bound, sign via PasskeyKit. Otherwise
  // sign with the dev keypair directly via the Stellar SDK so plain
  // payments (Send screen) still work without the smart wallet.
  if (await isPasskeyWallet()) {
    const kit = getKit();
    const credentialId = await getSecureItem(CREDENTIAL_ID_KEY);
    const signed = await kit.sign(unsignedXdr, {
      rpId: PESALO_DOMAIN,
      keyId: credentialId ?? "any",
    });
    const signedLike = signed as { toXDR?: () => string };
    if (typeof signedLike.toXDR === "function") return signedLike.toXDR();
    if (typeof signed === "string") return signed;
    return unsignedXdr;
  }

  const kp = await readDevKeypair();
  if (!kp) {
    throw new Error("No signing key on device. Create an account first.");
  }
  const tx = TransactionBuilder.fromXDR(unsignedXdr, STELLAR_TESTNET_PASSPHRASE);
  tx.sign(kp);
  return tx.toXDR();
}
