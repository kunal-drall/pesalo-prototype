import { createApp } from "./app";
import { config } from "./config";
import { startJobs, stopJobs } from "./jobs";

const app = createApp();

const server = app.listen(config.port, () => {
  startJobs();
  console.log(`[pesalo] API listening on :${config.port} (rpc=${config.sorobanRpcUrl})`);
});

function shutdown(signal: string) {
  console.log(`[pesalo] ${signal} received, shutting down…`);
  stopJobs();
  server.close(() => process.exit(0));
  // Hard exit if close hangs.
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
