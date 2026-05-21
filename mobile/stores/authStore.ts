import { create } from "zustand";

import * as passkey from "@/lib/passkey";
import { useWalletStore } from "@/stores/walletStore";

type AuthState = {
  isAuthenticated: boolean;
  walletAddress: string | null;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  createAccount: () => Promise<string | null>;
  login: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  walletAddress: null,
  isLoading: false,
  error: null,

  async checkAuth() {
    const walletAddress = await passkey.getWalletAddress();
    set({
      isAuthenticated: Boolean(walletAddress),
      walletAddress: walletAddress ?? null,
    });
    if (walletAddress) {
      const wallet = useWalletStore.getState();
      wallet.setAddress(walletAddress);
      await wallet.hydrate();
      // Best-effort background refresh; do not await so navigation stays snappy.
      wallet.refresh().catch(() => {});
    }
  },

  async createAccount() {
    set({ isLoading: true, error: null });
    try {
      const { address } = await passkey.createAccount();
      set({ isAuthenticated: true, walletAddress: address, isLoading: false });
      const wallet = useWalletStore.getState();
      wallet.setAddress(address);
      // Give Friendbot's funding tx a moment to land on Horizon before
      // we ask for balances. We refresh again later anyway, so this is
      // just to make the first paint show non-zero where possible.
      await new Promise((r) => setTimeout(r, 1500));
      await wallet.refresh();
      return address;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create account";
      set({ isLoading: false, error: message });
      return null;
    }
  },

  async login() {
    set({ isLoading: true, error: null });
    try {
      const walletAddress = await passkey.login();
      set({
        isAuthenticated: Boolean(walletAddress),
        walletAddress,
        isLoading: false,
      });
      if (walletAddress) {
        const wallet = useWalletStore.getState();
        wallet.setAddress(walletAddress);
        await wallet.refresh();
      }
      return walletAddress;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sign in";
      set({ isLoading: false, error: message });
      return null;
    }
  },

  async signOut() {
    await passkey.signOut();
    set({ isAuthenticated: false, walletAddress: null });
    await useWalletStore.getState().clear();
  },
}));
