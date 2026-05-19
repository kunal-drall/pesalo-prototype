import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

import { reportError } from "@/lib/observability/sentry";
import { signTransaction } from "@/lib/passkey";
import { stellarClient } from "@/lib/stellar/client";
import {
  extractInvocationParts,
  submitSorobanCall,
} from "@/lib/stellar/channels";
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
        const parts = extractInvocationParts(signed, stellarClient.networkPassphrase);
        const receipt = await submitSorobanCall(parts);
        setTxHash(receipt.hash);

        setStatus("confirming");
        const polled = await stellarClient.pollTransaction(receipt.hash);
        if (polled.status === "failed") {
          throw new Error("Transaction failed on chain");
        }

        setStatus("success");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refresh();
        return { hash: receipt.hash };
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
