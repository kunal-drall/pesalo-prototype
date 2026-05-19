import { create as createPasskey, get as getPasskey } from "react-native-passkeys";
import { PasskeyKit } from "passkey-kit";

import {
  CONTRACTS,
  DEFAULT_RPC_URL,
  PESALO_DOMAIN,
  STELLAR_TESTNET_PASSPHRASE,
} from "@/lib/utils/constants";
import { getSecureItem, setSecureItem } from "@/lib/storage/secure";

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

export async function getWalletAddress(): Promise<string | null> {
  return getSecureItem(WALLET_ADDRESS_KEY);
}

export async function createAccount(): Promise<string> {
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
  return wallet.contractId;
}

export async function login(): Promise<string | null> {
  const walletAddress = await getSecureItem(WALLET_ADDRESS_KEY);
  if (!walletAddress) {
    return null;
  }
  const kit = getKit();
  const credentialId = await getSecureItem(CREDENTIAL_ID_KEY);
  const wallet = await kit.connectWallet({
    rpId: PESALO_DOMAIN,
    keyId: credentialId ?? "any",
  });

  await setSecureItem(CREDENTIAL_ID_KEY, wallet.keyIdBase64);
  await setSecureItem(WALLET_ADDRESS_KEY, wallet.contractId || walletAddress);
  return wallet.contractId || walletAddress;
}

export async function signTransaction(unsignedXdr: string): Promise<string> {
  const kit = getKit();
  const credentialId = await getSecureItem(CREDENTIAL_ID_KEY);
  const signed = await kit.sign(unsignedXdr, {
    rpId: PESALO_DOMAIN,
    keyId: credentialId ?? "any",
  });

  // kit.sign returns the assembled Transaction. Serialize back to XDR for the
  // Channels relayer.
  const signedLike = signed as { toXDR?: () => string };
  if (typeof signedLike.toXDR === "function") {
    return signedLike.toXDR();
  }
  if (typeof signed === "string") return signed;
  return unsignedXdr;
}
