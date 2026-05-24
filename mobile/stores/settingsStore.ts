import { create } from "zustand";

type SettingsState = {
  displayCurrency: "USD" | "EUR";
  setDisplayCurrency: (currency: "USD" | "EUR") => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  displayCurrency: "USD",
  setDisplayCurrency(displayCurrency) {
    set({ displayCurrency });
  }
}));
