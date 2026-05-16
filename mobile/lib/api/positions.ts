import { apiGet } from "@/lib/api/client";
import { SavingsPosition } from "@/lib/stellar/types";

export async function fetchPositions(address: string) {
  return apiGet<{ fixed: SavingsPosition[]; flex: SavingsPosition[] }>(
    `/positions/${encodeURIComponent(address)}`
  );
}
