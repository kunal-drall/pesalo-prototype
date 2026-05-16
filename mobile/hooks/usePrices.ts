import { useEffect, useState } from "react";

import { fetchPrices } from "@/lib/api/prices";

export function usePrices() {
  const [prices, setPrices] = useState<{ XLM_USD: number; EURC_USD: number } | null>(null);

  useEffect(() => {
    let active = true;

    fetchPrices()
      .then((payload) => {
        if (active) {
          setPrices({ XLM_USD: payload.XLM_USD, EURC_USD: payload.EURC_USD });
        }
      })
      .catch(() => {
        if (active) {
          setPrices(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return prices;
}
