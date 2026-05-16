import { xdr } from "@stellar/stellar-sdk";

import { config } from "../config";
import { PriceInfo } from "../types";
import { getCached, setCached } from "./cache";
import { readContract } from "./sorobanReader";

const PRICE_CACHE_KEY = "prices:v1";
const REFLECTOR_DECIMALS = 14;

type ReflectorPrice = { price: bigint; timestamp: bigint };

export const priceService = {
  async getPrices(): Promise<PriceInfo> {
    const cached = getCached<PriceInfo>(PRICE_CACHE_KEY);
    if (cached) return cached;
    return refreshPrices();
  },
  refresh: refreshPrices,
};

async function refreshPrices(): Promise<PriceInfo> {
  const now = new Date().toISOString();
  const oracle = config.reflectorContract;

  const result: PriceInfo = {
    USDC_USD: 1,
    EURC_USD: 0,
    XLM_USD: 0,
    updatedAt: now,
  };

  if (!oracle) {
    setCached(PRICE_CACHE_KEY, result, config.cacheTtlMs);
    return result;
  }

  try {
    const [eurc, xlm] = await Promise.all([
      readReflector(oracle, "EURC"),
      readReflector(oracle, "XLM"),
    ]);
    result.EURC_USD = decode(eurc);
    result.XLM_USD = decode(xlm);
  } catch (err) {
    console.error("[priceService] Reflector read failed:", err);
  }

  setCached(PRICE_CACHE_KEY, result, config.cacheTtlMs);
  return result;
}

async function readReflector(oracle: string, symbol: string): Promise<ReflectorPrice | null> {
  try {
    const arg = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(symbol)]);
    return await readContract<ReflectorPrice | null>(oracle, "lastprice", [arg]);
  } catch {
    return null;
  }
}

function decode(p: ReflectorPrice | null): number {
  if (!p) return 0;
  return Number(p.price) / 10 ** REFLECTOR_DECIMALS;
}
