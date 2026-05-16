import { create as createPasskey, get as getPasskey } from "react-native-passkeys";
import { PasskeyKit } from "passkey-kit";

import {
  DEFAULT_RPC_URL,
  PESALO_DOMAIN,
  STELLAR_TESTNET_PASSPHRASE
} from "@/lib/utils/constants";
import { getSecureItem, setSecureItem } from "@/lib/storage/secure";

const WALLET_ADDRESS_KEY = "walletAddress";
const CREDENTIAL_ID_KEY = "credentialId";

const webAuthnBridge: NonNullable<ConstructorParameters<typeof PasskeyKit>[0]["WebAuthn"]> = {
  async startRegistration({ optionsJSON }) {
    const credential = await createPasskey(optionsJSON as Parameters<typeof createPasskey>[0]);
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
  }
};

const kit = new PasskeyKit({
  rpcUrl: DEFAULT_RPC_URL,
  networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  walletWasmHash: "",
  WebAuthn: webAuthnBridge
});

export async function getWalletAddress() {
  return getSecureItem(WALLET_ADDRESS_KEY);
}

export async function createAccount(): Promise<string> {
  const wallet = await kit.createWallet("Pesalo", "Pesalo Saver", {
    rpId: PESALO_DOMAIN,
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required"
    }
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

  const credentialId = await getSecureItem(CREDENTIAL_ID_KEY);
  const wallet = await kit.connectWallet({
    rpId: PESALO_DOMAIN,
    keyId: credentialId ?? "any"
  });

  await setSecureItem(CREDENTIAL_ID_KEY, wallet.keyIdBase64);
  await setSecureItem(WALLET_ADDRESS_KEY, wallet.contractId || walletAddress);

  return wallet.contractId || walletAddress;
}

export async function signTransaction(unsignedXdr: string): Promise<string> {
  const credentialId = await getSecureItem(CREDENTIAL_ID_KEY);
  const signed = await kit.sign(unsignedXdr, {
    rpId: PESALO_DOMAIN,
    keyId: credentialId ?? "any"
  });

  const signedLike = signed as { toXDR?: () => string };
  if (typeof signedLike.toXDR === "function") {
    return signedLike.toXDR();
  }

  return unsignedXdr;
}
