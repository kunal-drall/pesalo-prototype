import { PriceInfo } from "../types";

export const priceService = {
  async getPrices(): Promise<PriceInfo> {
    return {
      XLM_USD: 0.1125,
      EURC_USD: 1.08,
      updatedAt: new Date().toISOString()
    };
  }
};
