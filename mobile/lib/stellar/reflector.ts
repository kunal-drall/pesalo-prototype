import { xdr } from "@stellar/stellar-sdk";

import { stellarClient } from "@/lib/stellar/client";
import { CONTRACTS, SupportedAsset } from "@/lib/utils/constants";

/// On-device Reflector oracle reader. Replaces the dead `/v1/prices`
/// backend endpoint with a direct Soroban simulation against the public
/// Reflector "External CEX & DEX" contract on testnet (mainnet uses a
/// different address — see docs.reflector.network).
///
/// Reflector's ABI:
///
///   fn lastprice(asset: Asset) -> Option<PriceData>;
///   pub enum Asset { Stellar(Address), Other(Symbol) }
///   pub struct PriceData { price: i128, timestamp: u64 }
///
/// Prices are scaled by 10^14 (queryable via `decimals()`).

const REFLECTOR_DECIMALS = 14;
const REFLECTOR_SCALE = 10 ** REFLECTOR_DECIMALS;

type PriceData = { price: bigint; timestamp: bigint };

export type ReflectorPrices = {
  XLM_USD: number;
  USDC_USD: number;
  EURC_USD: number;
  updatedAt: string;
};

/// Build the ScVal for `Asset::Other(Symbol)` — a Soroban enum where
/// variant 0 is the discriminant symbol and the rest of the vec carries
/// the variant payload.
function assetOther(symbol: SupportedAsset): xdr.ScVal {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Other"),
    xdr.ScVal.scvSymbol(symbol),
  ]);
}

async function readOne(symbol: SupportedAsset): Promise<number> {
  if (!CONTRACTS.reflectorOracle) return 0;
  try {
    const result = await stellarClient.readContract<PriceData | null>(
      CONTRACTS.reflectorOracle,
      "lastprice",
      [assetOther(symbol)],
    );
    if (!result?.price) return 0;
    return Number(result.price) / REFLECTOR_SCALE;
  } catch (err) {
    console.warn(`[reflector] lastprice(${symbol}) failed:`, err);
    return 0;
  }
}

/// Fetches all three USD-denominated prices in parallel. Fields default
/// to 0 when the oracle is unreachable so the caller can still render.
export async function fetchReflectorPrices(): Promise<ReflectorPrices> {
  const [xlm, usdc, eurc] = await Promise.all([
    readOne("XLM"),
    readOne("USDC"),
    readOne("EURC"),
  ]);
  return {
    XLM_USD: xlm,
    USDC_USD: usdc,
    EURC_USD: eurc,
    updatedAt: new Date().toISOString(),
  };
}
