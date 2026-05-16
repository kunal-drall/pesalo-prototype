import { config } from "../config";
import { eventService } from "../services/eventService";
import { priceService } from "../services/priceService";
import { rateService } from "../services/rateService";

let started = false;
let timers: NodeJS.Timeout[] = [];

export function startJobs() {
  if (started || process.env.NODE_ENV === "test") return;
  started = true;

  // Warm caches before the first HTTP request lands.
  void rateService.refresh().catch((e) => console.error("[ratePoller] initial:", e));
  void priceService.refresh().catch((e) => console.error("[pricePoller] initial:", e));
  void eventService.indexLatest().catch((e) => console.error("[eventIndexer] initial:", e));

  timers.push(
    setInterval(() => {
      rateService.refresh().catch((e) => console.error("[ratePoller]", e));
    }, config.rateRefreshIntervalSec * 1000),
  );
  timers.push(
    setInterval(() => {
      priceService.refresh().catch((e) => console.error("[pricePoller]", e));
    }, config.priceRefreshIntervalSec * 1000),
  );
  timers.push(
    setInterval(() => {
      eventService.indexLatest().catch((e) => console.error("[eventIndexer]", e));
    }, config.eventRefreshIntervalSec * 1000),
  );
}

export function stopJobs() {
  started = false;
  for (const t of timers) clearInterval(t);
  timers = [];
}
