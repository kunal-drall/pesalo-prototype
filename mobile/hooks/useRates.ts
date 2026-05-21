import { useEffect, useState } from "react";

import { fetchRates, FixedRate, FlexRate } from "@/lib/api/rates";

export function useRates() {
  const [fixed, setFixed] = useState<FixedRate[]>([]);
  const [flex, setFlex] = useState<FlexRate[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await fetchRates();
        if (!active) return;
        // Backend may return either field as undefined when no markets
        // are open. Coalesce to [] so consumers can call .find / .map
        // without a guard.
        setFixed(payload?.rates ?? []);
        setFlex(payload?.flexRates ?? []);
        setUpdatedAt(payload?.updatedAt ?? null);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load rates");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return { fixed, flex, updatedAt, loading, error };
}
