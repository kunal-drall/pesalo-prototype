import crypto from "node:crypto";

import { getPool } from "../db/migrate";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LEN = 254; // RFC 5321
const MAX_SOURCE_LEN = 64;
const MAX_USER_AGENT_LEN = 512;

export type EarlyAccessInput = {
  email: string;
  source?: string;
  userAgent?: string;
  ip?: string;
};

export type EarlyAccessResult = {
  /// True when this email was newly recorded. False if it already existed
  /// (we still return success to avoid leaking subscription status).
  created: boolean;
};

export const earlyAccessService = {
  async register(input: EarlyAccessInput): Promise<EarlyAccessResult> {
    const email = (input.email ?? "").trim().toLowerCase();

    if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
      throw new InvalidEmailError("That doesn't look like a valid email");
    }

    const source = clamp(input.source, MAX_SOURCE_LEN);
    const userAgent = clamp(input.userAgent, MAX_USER_AGENT_LEN);
    const ipHash = input.ip ? hashIp(input.ip) : null;

    const pool = getPool();
    const result = await pool.query<{ id: number }>(
      `INSERT INTO early_access (email, source, user_agent, ip_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (LOWER(email)) DO NOTHING
       RETURNING id`,
      [email, source ?? null, userAgent ?? null, ipHash],
    );
    return { created: result.rowCount === 1 };
  },

  async count(): Promise<number> {
    const pool = getPool();
    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM early_access",
    );
    return Number(result.rows[0]?.count ?? "0");
  },
};

export class InvalidEmailError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "InvalidEmailError";
  }
}

function clamp(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

/// We never store raw IP addresses — only a salted hash so we can throttle
/// abuse without retaining PII. The salt is per-process by default; set
/// EARLY_ACCESS_IP_SALT in env for cross-deploy stability.
const IP_SALT =
  process.env.EARLY_ACCESS_IP_SALT ?? crypto.randomBytes(16).toString("hex");

function hashIp(ip: string): string {
  return crypto.createHmac("sha256", IP_SALT).update(ip).digest("hex");
}
