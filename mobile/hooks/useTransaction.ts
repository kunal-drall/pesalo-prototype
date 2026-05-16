import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

import { signTransaction } from "@/lib/passkey";
import { stellarClient } from "@/lib/stellar/client";
import { submitSponsoredTransaction } from "@/lib/stellar/launchtube";
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
  /// Skip the Launchtube hop. Useful when a contract has its own custom
  /// submission path (none currently, but reserved).
  skipSubmit?: boolean;
};

/// Drives the full lifecycle of a Soroban transaction from the UI:
///   build → sign → submit (Launchtube) → poll → refresh wallet store.
/// The status state machine lets the caller render an accurate spinner
/// label ("Face ID…", "Submitting…", "Confirming on chain…").
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
        const receipt = await submitSponsoredTransaction(signed);
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
