import { apiGet } from "@/lib/api/client";

export async function fetchPrices() {
  return apiGet<{ XLM_USD: number; EURC_USD: number; updatedAt: string }>("/prices");
}
