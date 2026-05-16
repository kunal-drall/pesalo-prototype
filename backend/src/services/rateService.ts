import { config } from "../config";
import { FlexRateInfo, RateInfo } from "../types";

const updatedAt = () => new Date().toISOString();

export const rateService = {
  async getRates(): Promise<{ rates: RateInfo[]; flexRates: FlexRateInfo[]; updatedAt: string }> {
    const now = updatedAt();

    return {
      rates: [
        {
          asset: "USDC",
          maturity: "2026-09-15",
          fixedAPY: 7.2,
          days: 90,
          market: config.contracts.usdcMarket,
          updatedAt: now
        },
        {
          asset: "EURC",
          maturity: "2026-09-15",
          fixedAPY: 5.8,
          days: 90,
          market: config.contracts.eurcMarket,
          updatedAt: now
        }
      ],
      flexRates: [
        { asset: "USDC", apy: 12.0, updatedAt: now },
        { asset: "EURC", apy: 9.8, updatedAt: now },
        { asset: "XLM", apy: 4.0, updatedAt: now }
      ],
      updatedAt: now
    };
  },

  async getMarkets() {
    const rates = await this.getRates();

    return rates.rates.map((rate) => ({
      address: rate.market,
      asset: rate.asset,
      maturity: rate.maturity,
      tvl: "0",
      impliedRate: rate.fixedAPY
    }));
  }
};
