import { create } from "zustand";

import { getCache, setCache } from "@/lib/storage/cache";
import { AssetBalance, SavingsPosition } from "@/lib/stellar/types";

type WalletState = {
  balances: AssetBalance[];
  positions: SavingsPosition[];
  lastUpdated: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CACHE_KEY = "pesalo-wallet-cache";

export const useWalletStore = create<WalletState>((set, get) => ({
  balances: [],
  positions: [],
  lastUpdated: null,
  async hydrate() {
    const cached = await getCache<Pick<WalletState, "balances" | "positions" | "lastUpdated">>(
      CACHE_KEY
    );

    if (cached) {
      set(cached);
    }
  },
  async refresh() {
    const next = {
      balances: get().balances,
      positions: get().positions,
      lastUpdated: new Date().toISOString()
    };
    set(next);
    await setCache(CACHE_KEY, next);
  }
}));
