import { useMemo } from "react";

import { useWalletStore } from "@/stores/walletStore";

export function useSavings() {
  const positions = useWalletStore((state) => state.positions);

  return useMemo(
    () => ({
      fixed: positions.filter((position) => position.type === "fixed"),
      flex: positions.filter((position) => position.type === "flex")
    }),
    [positions]
  );
}
