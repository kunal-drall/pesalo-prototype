import { startEventIndexer } from "./eventIndexer";
import { startMaturityChecker } from "./maturityChecker";
import { startPricePoller } from "./pricePoller";
import { startRatePoller } from "./ratePoller";

let started = false;

export function startJobs() {
  if (started || process.env.NODE_ENV === "test") {
    return;
  }

  started = true;
  startRatePoller();
  startPricePoller();
  startEventIndexer();
  startMaturityChecker();
}
