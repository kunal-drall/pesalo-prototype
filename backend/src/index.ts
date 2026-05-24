import { createApp } from "./app";
import { config } from "./config";
import { closePool, ensureSchema } from "./db/migrate";
import { startJobs, stopJobs } from "./jobs";

const app = createApp();

const server = app.listen(config.port, () => {
  startJobs();
  console.log(
    `[pesalo] API listening on :${config.port} (rpc=${config.sorobanRpcUrl})`,
  );
});

// Run schema migration on startup. Idempotent — safe across rolling deploys.
// We don't block server start on this because the API can still serve health
// and read-only Soroban endpoints if the DB is briefly unreachable.
ensureSchema().catch((err) => {
  console.error("[pesalo] schema migration failed:", err);
});

async function shutdown(signal: string) {
  console.log(`[pesalo] ${signal} received, shutting down…`);
  stopJobs();
  server.close(async () => {
    await closePool().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
