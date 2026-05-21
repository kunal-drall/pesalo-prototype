import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

import { reportError } from "@/lib/observability/sentry";
import { signTransaction } from "@/lib/passkey";
import { stellarClient } from "@/lib/stellar/client";
import {
  extractInvocationParts,
  submitSorobanCall,
} from "@/lib/stellar/channels";
import { submitClassicTx } from "@/lib/stellar/payments";
import { useWalletStore } from "@/stores/walletStore";

export type TxStatus =
  | "idle"
  | "building"
  | "signing"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

type RunOptions = {
  /// Skip the network submission step. Useful for dry-run flows.
  skipSubmit?: boolean;
  /// "soroban" routes through the OZ Channels relayer (smart-wallet
  /// boost / auto-earn). "classic" submits a plain Stellar operation
  /// straight to Horizon (Send + Swap from the dev keypair).
  mode?: "soroban" | "classic";
};

/// Drives the full lifecycle of a Soroban transaction from the UI:
///   build → passkey sign → extract (func, auth) → OZ Channels submit → poll
/// Refreshes the wallet store on success and emits haptic feedback on the
/// terminal states.
export function useTransaction() {
  const refresh = useWalletStore((s) => s.refresh);
  const [status, setStatus] = useState<TxStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const run = useCallback(
    async (build: () => Promise<string>, options: RunOptions = {}) => {
      setStatus("building");
      setError(null);
      setTxHash(null);

      try {
        const unsigned = await build();

        setStatus("signing");
        const signed = await signTransaction(unsigned);

        if (options.skipSubmit) {
          setStatus("success");
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return { hash: null };
        }

        setStatus("submitting");

        let hash: string;
        if (options.mode === "classic") {
          // Horizon submission for classic Stellar ops (payments, swaps,
          // change_trust). Horizon returns success / failure synchronously
          // once the tx is included in a ledger.
          const receipt = await submitClassicTx(signed);
          hash = receipt.hash;
          setTxHash(hash);
          setStatus("confirming");
        } else {
          const parts = extractInvocationParts(signed, stellarClient.networkPassphrase);
          const receipt = await submitSorobanCall(parts);
          if (!receipt.hash) {
            throw new Error(
              `Channels marked this transaction as ${receipt.status ?? "readonly"} — nothing was submitted on chain`,
            );
          }
          hash = receipt.hash;
          setTxHash(hash);

          setStatus("confirming");
          const polled = await stellarClient.pollTransaction(hash);
          if (polled.status === "failed") {
            throw new Error("Transaction failed on chain");
          }
        }

        setStatus("success");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refresh();
        return { hash };
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Something went wrong. Please try again.";
        setStatus("error");
        setError(message);
        reportError(caught, { phase: "useTransaction" });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return { hash: null, error: message };
      }
    },
    [refresh],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { status, error, txHash, run, reset };
}
