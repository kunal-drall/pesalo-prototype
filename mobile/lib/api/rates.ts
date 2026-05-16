import { apiGet } from "@/lib/api/client";
import { SupportedAsset } from "@/lib/utils/constants";

export type FixedRate = {
  asset: SupportedAsset;
  apy: number;
  days: number;
  maturity: string;
};

export async function fetchRates() {
  return apiGet<{ rates: FixedRate[] }>("/rates");
}
