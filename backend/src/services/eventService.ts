import { rpc, scValToNative, xdr } from "@stellar/stellar-sdk";

import { config, configuredFixedMarkets } from "../config";
import { ActivityEvent, AssetCode } from "../types";
import { getCached, setCached } from "./cache";
import { sorobanServer } from "./sorobanReader";

const EVENT_CACHE_PREFIX = "activity:";
const MAX_EVENTS_PER_ADDRESS = 50;

// Map our protocol's emitted topic symbols to user-facing activity kinds.
// Keys mirror the symbol_short!(...) literals in the Soroban contracts.
const TOPIC_TO_KIND: Record<string, ActivityEvent["kind"]> = {
  auto_dep: "auto_deposit",
  auto_wd: "auto_withdraw",
  boost: "boost",
  unboost: "unboost",
  redeem_b: "redeem_boost",
  transfer: "send",
};

type RawEvent = {
  contractId: string;
  ledger: number;
  topic: string;
  values: unknown[];
  txHash: string;
  occurredAt: string;
};

const recentEvents: RawEvent[] = [];
let lastIndexedLedger: number | null = null;

export const eventService = {
  /// Indexes new events emitted by Router + Splitter + Market contracts since
  /// the last poll. Stored in-memory; suitable for low-volume MVP. Move to
  /// Postgres when event volume grows.
  async indexLatest(): Promise<number> {
    const contracts = collectIndexableContracts();
    if (contracts.length === 0) return 0;

    let startLedger: number;
    if (lastIndexedLedger === null) {
      const latest = await sorobanServer.getLatestLedger();
      startLedger = Math.max(1, latest.sequence - 200);
    } else {
      startLedger = lastIndexedLedger + 1;
    }

    const response = await sorobanServer.getEvents({
      startLedger,
      filters: [{ type: "contract", contractIds: contracts }],
      limit: 200,
    });

    for (const event of response.events) {
      recentEvents.push(toRaw(event));
    }
    if (response.events.length > 0) {
      lastIndexedLedger = response.events[response.events.length - 1].ledger;
    } else if (response.latestLedger) {
      lastIndexedLedger = response.latestLedger;
    }

    if (recentEvents.length > MAX_EVENTS_PER_ADDRESS * 100) {
      recentEvents.splice(0, recentEvents.length - MAX_EVENTS_PER_ADDRESS * 50);
    }
    return response.events.length;
  },

  async getActivityFor(address: string): Promise<{ events: ActivityEvent[]; updatedAt: string }> {
    const updatedAt = new Date().toISOString();
    const cacheKey = `${EVENT_CACHE_PREFIX}${address}`;
    const cached = getCached<{ events: ActivityEvent[]; updatedAt: string }>(cacheKey);
    if (cached) return cached;

    const events: ActivityEvent[] = [];
    for (const raw of recentEvents) {
      const event = projectForAddress(raw, address);
      if (event) events.push(event);
    }
    events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    const trimmed = events.slice(0, MAX_EVENTS_PER_ADDRESS);
    const payload = { events: trimmed, updatedAt };
    setCached(cacheKey, payload, config.cacheTtlMs);
    return payload;
  },
};

function collectIndexableContracts(): string[] {
  return [
    config.contracts.router,
    ...configuredFixedMarkets().flatMap((m) => [m.market, m.splitter]),
  ].filter(Boolean);
}

function toRaw(event: rpc.Api.EventResponse): RawEvent {
  const topics = event.topic
    .map((t) => {
      try {
        return String(scValToNative(t));
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  let values: unknown[] = [];
  try {
    values = [scValToNative(event.value)];
  } catch {
    values = [];
  }
  return {
    contractId: event.contractId?.toString() ?? "",
    ledger: event.ledger,
    topic: topics[0] ?? "",
    values,
    txHash: event.txHash ?? "",
    occurredAt: event.ledgerClosedAt ?? new Date().toISOString(),
  };
}

function projectForAddress(raw: RawEvent, address: string): ActivityEvent | null {
  const kind = TOPIC_TO_KIND[raw.topic];
  if (!kind) return null;
  // Each emitted tuple's first arg is the user/affected address. We compare
  // by string against the requested address.
  const concerns = raw.values.some((v) => containsAddress(v, address));
  if (!concerns) return null;
  const asset = assetForContract(raw.contractId);
  const amount = numericFromValues(raw.values);
  return {
    id: `${raw.txHash}-${raw.ledger}`,
    txHash: raw.txHash,
    kind,
    asset,
    amount,
    occurredAt: raw.occurredAt,
  };
}

function containsAddress(value: unknown, address: string): boolean {
  if (typeof value === "string") return value === address;
  if (Array.isArray(value)) return value.some((v) => containsAddress(v, address));
  if (value && typeof value === "object") {
    return Object.values(value).some((v) => containsAddress(v, address));
  }
  return false;
}

function assetForContract(contractId: string): AssetCode {
  if (contractId === config.contracts.usdcMarket || contractId === config.contracts.usdcSplitter)
    return "USDC";
  if (contractId === config.contracts.eurcMarket || contractId === config.contracts.eurcSplitter)
    return "EURC";
  return "USDC";
}

function numericFromValues(values: unknown[]): number {
  for (const v of values) {
    const n = pickNumeric(v);
    if (n !== null) return n;
  }
  return 0;
}

function pickNumeric(value: unknown): number | null {
  if (typeof value === "bigint") return Number(value) / 1e7;
  if (typeof value === "number") return value / 1e7;
  if (Array.isArray(value)) {
    for (const v of value) {
      const n = pickNumeric(v);
      if (n !== null) return n;
    }
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) {
      const n = pickNumeric(v);
      if (n !== null) return n;
    }
  }
  return null;
}

// Hidden imports kept for editor go-to-def comfort.
void xdr;
