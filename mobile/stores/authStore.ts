import { create } from "zustand";

import * as passkey from "@/lib/passkey";

type AuthState = {
  isAuthenticated: boolean;
  walletAddress: string | null;
  checkAuth: () => Promise<void>;
  createAccount: () => Promise<string>;
  login: () => Promise<string | null>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  walletAddress: null,
  async checkAuth() {
    const walletAddress = await passkey.getWalletAddress();
    set({
      isAuthenticated: Boolean(walletAddress),
      walletAddress
    });
  },
  async createAccount() {
    const walletAddress = await passkey.createAccount();
    set({ isAuthenticated: true, walletAddress });
    return walletAddress;
  },
  async login() {
    const walletAddress = await passkey.login();
    set({
      isAuthenticated: Boolean(walletAddress),
      walletAddress
    });
    return walletAddress;
  }
}));
