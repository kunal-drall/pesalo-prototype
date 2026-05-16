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
      const walletAddress = await passkey.createAccount();
      set({ isAuthenticated: true, walletAddress, isLoading: false });
      const wallet = useWalletStore.getState();
      wallet.setAddress(walletAddress);
      await wallet.refresh();
      return walletAddress;
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
    set({ isAuthenticated: false, walletAddress: null });
    await useWalletStore.getState().clear();
  },
}));
