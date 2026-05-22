import { DEFAULT_HORIZON_URL, SUPPORTED_ASSETS } from "@/lib/utils/constants";
import {
  TESTNET_EURC_ISSUER,
  TESTNET_USDC_ISSUER,
} from "@/lib/stellar/payments";
import { ActivityEvent } from "@/lib/stellar/types";

/// Fetches the user's transaction history directly from Horizon's
/// operations endpoint and translates it into our ActivityEvent shape.
/// Lets the Activity tab work even when the Railway backend is offline.
///
/// We pull the latest 50 operations of types that matter to the wallet
/// (payment, create_account, path_payment_strict_send/receive,
/// change_trust) and ignore the rest (account_merge, manage_offer, etc.)
/// because they don't have a clean Pesalo event mapping.
export async function fetchActivityFromHorizon(address: string): Promise<ActivityEvent[]> {
  const url = `${DEFAULT_HORIZON_URL.replace(/\/$/, "")}/accounts/${address}/operations?order=desc&limit=50&include_failed=false&join=transactions`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Horizon returned ${res.status} for operations`);
  }
  const body = (await res.json()) as {
    _embedded?: { records?: HorizonOperation[] };
  };
  const records = body?._embedded?.records ?? [];
  return records.flatMap((op) => mapToEvent(op, address));
}

type HorizonOperation = {
  id: string;
  transaction_hash: string;
  created_at: string;
  type: string;
  source_account?: string;
  from?: string;
  to?: string;
  funder?: string;
  account?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  amount?: string;
  starting_balance?: string;
  source_asset_type?: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
  source_amount?: string;
  source_max?: string;
  destination?: string;
  destination_min?: string;
  trustor?: string;
  trustee?: string;
};

function mapToEvent(op: HorizonOperation, self: string): ActivityEvent[] {
  switch (op.type) {
    case "create_account": {
      // Friendbot funding lands here — `funder` is friendbot, `account`
      // is the new account, amount is `starting_balance`.
      if (op.account !== self) return [];
      return [
        {
          id: op.id,
          txHash: op.transaction_hash,
          kind: "receive",
          asset: "XLM",
          amount: Number(op.starting_balance ?? "0"),
          counterparty: op.funder,
          occurredAt: op.created_at,
        },
      ];
    }
    case "payment": {
      const asset = parseAsset(op.asset_type, op.asset_code, op.asset_issuer);
      if (!asset) return [];
      const isOutbound = op.from === self;
      const isInbound = op.to === self;
      if (!isOutbound && !isInbound) return [];
      return [
        {
          id: op.id,
          txHash: op.transaction_hash,
          kind: isOutbound ? "send" : "receive",
          asset,
          amount: Number(op.amount ?? "0"),
          counterparty: isOutbound ? op.to : op.from,
          occurredAt: op.created_at,
        },
      ];
    }
    case "path_payment_strict_send":
    case "path_payment_strict_receive": {
      // For a self-swap (source === destination), we show one "send"
      // for the source asset and one "receive" for the destination.
      const sourceAsset = parseAsset(
        op.source_asset_type,
        op.source_asset_code,
        op.source_asset_issuer,
      );
      const destAsset = parseAsset(op.asset_type, op.asset_code, op.asset_issuer);
      const isSource = op.from === self;
      const isDest = op.to === self;
      const out: ActivityEvent[] = [];
      if (sourceAsset && isSource) {
        out.push({
          id: `${op.id}-source`,
          txHash: op.transaction_hash,
          kind: "send",
          asset: sourceAsset,
          amount: Number(op.source_amount ?? op.source_max ?? "0"),
          counterparty: op.to,
          occurredAt: op.created_at,
        });
      }
      if (destAsset && isDest) {
        out.push({
          id: `${op.id}-dest`,
          txHash: op.transaction_hash,
          kind: "receive",
          asset: destAsset,
          amount: Number(op.amount ?? "0"),
          counterparty: op.from,
          occurredAt: op.created_at,
        });
      }
      return out;
    }
    case "change_trust":
      // No clean Pesalo event for trustline changes; surface as a
      // zero-amount claim entry so the user sees something happened.
      // We could add a dedicated kind for it later.
      return [];
    default:
      return [];
  }
}

function parseAsset(
  assetType: string | undefined,
  code: string | undefined,
  issuer: string | undefined,
): "USDC" | "EURC" | "XLM" | null {
  if (assetType === "native") return "XLM";
  if (code === "USDC" && issuer === TESTNET_USDC_ISSUER) return "USDC";
  if (code === "EURC" && issuer === TESTNET_EURC_ISSUER) return "EURC";
  return null;
}

void SUPPORTED_ASSETS;
