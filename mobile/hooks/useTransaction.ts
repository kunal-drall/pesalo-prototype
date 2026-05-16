import * as Haptics from "expo-haptics";
import { useState } from "react";

import { signTransaction } from "@/lib/passkey";

export type TransactionState =
  | "idle"
  | "building"
  | "signing"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

export function useTransaction() {
  const [state, setState] = useState<TransactionState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function run(build: () => Promise<string>, submit: (signedXdr: string) => Promise<void>) {
    try {
      setError(null);
      setState("building");
      const xdr = await build();
      setState("signing");
      const signed = await signTransaction(xdr);
      setState("submitting");
      await submit(signed);
      setState("confirming");
      await new Promise((resolve) => setTimeout(resolve, 300));
      setState("success");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function reset() {
    setState("idle");
    setError(null);
  }

  return { state, error, run, reset };
}
