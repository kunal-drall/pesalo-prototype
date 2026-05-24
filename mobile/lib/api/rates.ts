import { apiGet } from "@/lib/api/client";
import { SupportedAsset } from "@/lib/utils/constants";

export type FixedRate = {
  asset: SupportedAsset;
  apy: number;
  days: number;
  maturity: string;
  market: string;
};

export type FlexRate = {
  asset: SupportedAsset;
  apy: number;
};

export type RatesResponse = {
  rates: FixedRate[];
  flexRates: FlexRate[];
  updatedAt: string;
};

export async function fetchRates(): Promise<RatesResponse> {
  return apiGet<RatesResponse>("/rates");
}
