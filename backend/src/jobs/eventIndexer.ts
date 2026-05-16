import cron from "node-cron";

import { eventService } from "../services/eventService";

export function startEventIndexer() {
  cron.schedule("*/30 * * * * *", async () => {
    await eventService.indexLatestEvents();
  });
}
