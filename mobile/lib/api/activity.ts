import { apiGet } from "@/lib/api/client";
import { ActivityEvent } from "@/lib/stellar/types";

export type ActivityResponse = {
  events: ActivityEvent[];
  updatedAt: string;
};

export async function fetchActivity(address: string): Promise<ActivityResponse> {
  return apiGet<ActivityResponse>(`/activity/${encodeURIComponent(address)}`);
}
