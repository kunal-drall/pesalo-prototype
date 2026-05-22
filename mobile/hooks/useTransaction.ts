import type { Transaction } from "@stellar/stellar-sdk";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

import { reportError } from "@/lib/observability/sentry";
import { signTransaction } from "@/lib/passkey";
import { stellarClient } from "@/lib/stellar/client";
import {
  extractInvocationParts,
  submitSorobanCall,
} from "@/lib/stellar/channels";
import { signAndSubmitClassic } from "@/lib/stellar/payments";
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

/// Drives the full lifecycle of a Soroban contract transaction from
/// the UI: build → passkey sign → OZ Channels submit → poll. Use
/// `runClassic` for plain Stellar operations (Send / Swap / trustline).
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
        if (!receipt.hash) {
          throw new Error(
            `Channels marked this transaction as ${receipt.status ?? "readonly"} — nothing was submitted on chain`,
          );
        }
        const hash = receipt.hash;
        setTxHash(hash);

        setStatus("confirming");
        const polled = await stellarClient.pollTransaction(hash);
        if (polled.status === "failed") {
          throw new Error("Transaction failed on chain");
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

  /// Classic Stellar tx flow: caller provides a builder that returns a
  /// fully-formed Transaction object, we sign it with the on-device dev
  /// keypair, and submit straight to Horizon. The Transaction never
  /// crosses an XDR boundary, which dodges the "unknown EnvelopeType"
  /// failure caused by multiple @stellar/stellar-base copies in
  /// node_modules.
  const runClassic = useCallback(
    async (build: () => Promise<Transaction>) => {
      setStatus("building");
      setError(null);
      setTxHash(null);

      try {
        const tx = await build();

        setStatus("signing");
        // `signAndSubmitClassic` does both — but we emit the lifecycle
        // events so the UI overlay shows expected stages.
        setStatus("submitting");
        const receipt = await signAndSubmitClassic(tx);
        const hash = receipt.hash;
        setTxHash(hash);
        setStatus("confirming");

        setStatus("success");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refresh();
        return { hash };
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Something went wrong. Please try again.";
        setStatus("error");
        setError(message);
        reportError(caught, { phase: "useTransaction.classic" });
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

  return { status, error, txHash, run, runClassic, reset };
}
