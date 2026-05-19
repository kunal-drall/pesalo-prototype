import { useCallback, useEffect, useState } from "react";

import { fetchActivity } from "@/lib/api/activity";
import { ActivityEvent } from "@/lib/stellar/types";

/// Fetches and exposes the user's activity feed from `/v1/activity/:addr`.
/// Returns a `refresh` callback so the Activity screen can power a
/// pull-to-refresh.
export function useActivity(address: string | null) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const payload = await fetchActivity(address);
      setEvents(payload.events);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load activity");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, refresh: load };
}
