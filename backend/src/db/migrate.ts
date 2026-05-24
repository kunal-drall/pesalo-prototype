import pg from "pg";

import { config } from "../config";
import { SCHEMA_SQL } from "./schema";

let migratedAt: Date | null = null;
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error("DATABASE_URL not configured");
    }
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      // Railway's internal Postgres hostname is unencrypted within the VPC;
      // the public proxy URL requires TLS. We tolerate self-signed certs.
      ssl: config.databaseUrl.includes(".railway.internal")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/// Apply the schema exactly once per process. Every CREATE is IF NOT EXISTS,
/// so re-runs across deploys are safe.
export async function ensureSchema(): Promise<void> {
  if (migratedAt) return;
  if (!config.databaseUrl) {
    console.warn("[migrate] DATABASE_URL not set — skipping schema bootstrap");
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query(SCHEMA_SQL);
    migratedAt = new Date();
    console.log(`[migrate] schema applied at ${migratedAt.toISOString()}`);
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
