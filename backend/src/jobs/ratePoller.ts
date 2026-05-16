import cron from "node-cron";

import { rateService } from "../services/rateService";

export function startRatePoller() {
  cron.schedule("*/1 * * * *", async () => {
    await rateService.getRates();
  });
}
