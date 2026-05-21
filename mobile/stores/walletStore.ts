import { create } from "zustand";

import { fetchPositions } from "@/lib/api/positions";
import { fetchPrices, PricesResponse } from "@/lib/api/prices";
import { fetchRates, RatesResponse } from "@/lib/api/rates";
import { stellarClient } from "@/lib/stellar/client";
import { AssetBalance, SavingsPosition } from "@/lib/stellar/types";
import { getCache, setCache } from "@/lib/storage/cache";
import { SUPPORTED_ASSETS, SupportedAsset } from "@/lib/utils/constants";

type WalletState = {
  address: string | null;
  balances: AssetBalance[];
  positions: SavingsPosition[];
  rates: RatesResponse | null;
  prices: PricesResponse | null;
  lastUpdated: string | null;
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  totalUsd: number;

  setAddress: (address: string | null) => void;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => Promise<void>;
};

const CACHE_KEY = "pesalo-wallet-v2";
/// Treat cached data as stale after 60 seconds — UI shows a "refreshing" hint.
const STALE_AFTER_MS = 60_000;

type CachePayload = Pick<
  WalletState,
  "address" | "balances" | "positions" | "rates" | "prices" | "lastUpdated" | "totalUsd"
>;

const emptyBalances: AssetBalance[] = SUPPORTED_ASSETS.map((asset) => ({
  asset,
  amount: 0,
  usdValue: 0,
}));

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  balances: emptyBalances,
  positions: [],
  rates: null,
  prices: null,
  lastUpdated: null,
  isLoading: false,
  isStale: false,
  error: null,
  totalUsd: 0,

  setAddress(address) {
    set({ address, error: null });
  },

  async hydrate() {
    const cached = await getCache<CachePayload>(CACHE_KEY);
    if (cached) {
      const stale =
        cached.lastUpdated &&
        Date.now() - new Date(cached.lastUpdated).getTime() > STALE_AFTER_MS;
      set({
        address: cached.address ?? get().address,
        balances: cached.balances ?? emptyBalances,
        positions: cached.positions ?? [],
        rates: cached.rates ?? null,
        prices: cached.prices ?? null,
        lastUpdated: cached.lastUpdated ?? null,
        totalUsd: cached.totalUsd ?? 0,
        isStale: Boolean(stale),
      });
    }
  },

  async refresh() {
    const address = get().address;
    if (!address) return;
    set({ isLoading: true, error: null });

    try {
      // Pull from chain + backend in parallel. The backend is a read-through
      // cache: if it's down, we still recover via the on-chain queries.
      const [horizonBalances, ratesResult, pricesResult, positionsResult] =
        await Promise.allSettled([
          stellarClient.getBalances(address),
          fetchRates(),
          fetchPrices(),
          fetchPositions(address),
        ]);

      const rates = ratesResult.status === "fulfilled" ? ratesResult.value : get().rates;
      const prices = pricesResult.status === "fulfilled" ? pricesResult.value : get().prices;
      // Backend may return `fixed` or `flex` as undefined when no
      // positions of that type exist. Default-coalesce so we don't
      // explode the whole refresh just to surface "0 positions".
      const positions =
        positionsResult.status === "fulfilled"
          ? [
              ...(positionsResult.value?.fixed ?? []),
              ...(positionsResult.value?.flex ?? []),
            ]
          : get().positions;

      const balances = mergeBalances(
        horizonBalances.status === "fulfilled" ? horizonBalances.value : get().balances,
        prices,
      );
      const totalUsd = balances.reduce((sum, b) => sum + b.usdValue, 0);

      const next: CachePayload = {
        address,
        balances,
        positions,
        rates,
        prices,
        lastUpdated: new Date().toISOString(),
        totalUsd,
      };

      set({ ...next, isLoading: false, isStale: false, error: null });
      await setCache(CACHE_KEY, next);
    } catch (err) {
      set({
        isLoading: false,
        isStale: true,
        error: err instanceof Error ? err.message : "Unable to refresh wallet",
      });
    }
  },

  async clear() {
    set({
      address: null,
      balances: emptyBalances,
      positions: [],
      rates: null,
      prices: null,
      lastUpdated: null,
      totalUsd: 0,
      isStale: false,
      error: null,
    });
    await setCache(CACHE_KEY, {} as CachePayload);
  },
}));

function mergeBalances(
  balances: AssetBalance[],
  prices: PricesResponse | null,
): AssetBalance[] {
  // Ensure all supported assets are represented even if Horizon omitted them
  // (a newly-created wallet has no trustlines yet).
  const byAsset = new Map<SupportedAsset, AssetBalance>(
    balances.map((b) => [b.asset, b]),
  );
  return SUPPORTED_ASSETS.map((asset) => {
    const existing = byAsset.get(asset) ?? { asset, amount: 0, usdValue: 0 };
    const usd = computeUsd(asset, existing.amount, prices);
    return { ...existing, usdValue: usd };
  });
}

function computeUsd(
  asset: SupportedAsset,
  amount: number,
  prices: PricesResponse | null,
): number {
  if (!prices) {
    return asset === "USDC" ? amount : 0;
  }
  if (asset === "USDC") return amount * prices.USDC_USD;
  if (asset === "EURC") return amount * prices.EURC_USD;
  return amount * prices.XLM_USD;
}
