import { apiGet } from "@/lib/api/client";
import { SavingsPosition } from "@/lib/stellar/types";

export type PositionsResponse = {
  fixed: SavingsPosition[];
  flex: SavingsPosition[];
  updatedAt: string;
};

export async function fetchPositions(address: string): Promise<PositionsResponse> {
  return apiGet<PositionsResponse>(`/positions/${encodeURIComponent(address)}`);
}
