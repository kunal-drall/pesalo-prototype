import { useEffect, useRef, useState } from "react";

import {
  AutoEarnEvent,
  watchIncomingDeposits,
} from "@/lib/passkey/autoEarn";
import { getAgreementState, AgreementState } from "@/lib/passkey/agreement";
import { useWalletStore } from "@/stores/walletStore";

type Status = "idle" | "watching" | "blocked";

type State = {
  status: Status;
  agreement: AgreementState;
  lastEvent: AutoEarnEvent | null;
};

/// Drives the silent auto-deposit watcher. Mount it once at the app root —
/// it boots the Horizon stream when the agreement is active, and tears it
/// down on unmount or when the wallet address changes.
///
/// The UI rewrite will replace this hook's mount point (currently nowhere —
/// the existing screens don't call it yet) with the new Home screen.
export function useAutoEarn(): State {
  const walletAddress = useWalletStore((s) => s.address);
  const refresh = useWalletStore((s) => s.refresh);
  const [agreement, setAgreement] = useState<AgreementState>({ kind: "uninitialized" });
  const [lastEvent, setLastEvent] = useState<AutoEarnEvent | null>(null);
  const handleRef = useRef<{ stop: () => void } | null>(null);

  // Check agreement state on mount and whenever the wallet address changes.
  useEffect(() => {
    let cancelled = false;
    getAgreementState().then((state) => {
      if (!cancelled) setAgreement(state);
    });
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  // (Re)start the watcher when the agreement becomes active.
  useEffect(() => {
    if (handleRef.current) {
      handleRef.current.stop();
      handleRef.current = null;
    }
    if (!walletAddress) return;
    if (agreement.kind !== "active") return;

    const handle = watchIncomingDeposits({
      walletAddress,
      onEvent: (event) => {
        setLastEvent(event);
        if (event.kind === "deposited") {
          refresh().catch(() => {});
        }
      },
    });
    handleRef.current = handle;
    return () => {
      handle.stop();
      handleRef.current = null;
    };
  }, [walletAddress, agreement.kind, refresh]);

  const status: Status =
    !walletAddress
      ? "idle"
      : agreement.kind === "active"
        ? "watching"
        : "blocked";

  return { status, agreement, lastEvent };
}
