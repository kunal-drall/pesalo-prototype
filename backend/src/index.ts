import { createApp } from "./app";
import { config } from "./config";
import { startJobs } from "./jobs";

const app = createApp();

app.listen(config.port, () => {
  startJobs();
  console.log(`Pesalo API listening on :${config.port}`);
});
