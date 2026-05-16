import pg from "pg";

import { config } from "../config";

let pool: pg.Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl || undefined
    });
  }

  return pool;
}

export async function query<T>(text: string, values: unknown[] = []) {
  const result = await getPool().query<T>(text, values);
  return result.rows;
}
