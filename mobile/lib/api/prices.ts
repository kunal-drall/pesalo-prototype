import { apiGet } from "@/lib/api/client";

export type PricesResponse = {
  XLM_USD: number;
  EURC_USD: number;
  USDC_USD: number;
  updatedAt: string;
};

export async function fetchPrices(): Promise<PricesResponse> {
  return apiGet<PricesResponse>("/prices");
}
