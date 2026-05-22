import { useCallback, useEffect, useState } from "react";

import { fetchActivityFromHorizon } from "@/lib/stellar/horizonActivity";
import { ActivityEvent } from "@/lib/stellar/types";

/// Loads the user's activity feed straight from Horizon's
/// /accounts/:id/operations endpoint. Reads work without a backend, so
/// the Activity tab survives the indexer being down.
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
      const fresh = await fetchActivityFromHorizon(address);
      setEvents(fresh);
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
