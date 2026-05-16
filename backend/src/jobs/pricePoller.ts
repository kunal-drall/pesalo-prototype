import cron from "node-cron";

import { priceService } from "../services/priceService";

export function startPricePoller() {
  cron.schedule("*/15 * * * * *", async () => {
    await priceService.getPrices();
  });
}
