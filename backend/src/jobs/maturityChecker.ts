import cron from "node-cron";

export function startMaturityChecker() {
  cron.schedule("0 */1 * * *", async () => {
    await Promise.resolve();
  });
}
