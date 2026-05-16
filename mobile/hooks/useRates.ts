import { useEffect, useState } from "react";

import { fetchRates, FixedRate } from "@/lib/api/rates";

export function useRates() {
  const [rates, setRates] = useState<FixedRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchRates()
      .then((payload) => {
        if (active) {
          setRates(payload.rates);
        }
      })
      .catch(() => {
        if (active) {
          setRates([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { rates, loading };
}
