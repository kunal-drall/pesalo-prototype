import cors from "cors";
import express from "express";

import { feedbackRouter } from "./routes/feedback";
import { healthRouter } from "./routes/health";
import { marketsRouter } from "./routes/markets";
import { positionsRouter } from "./routes/positions";
import { pricesRouter } from "./routes/prices";
import { ratesRouter } from "./routes/rates";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "64kb" }));

  app.use("/v1/rates", ratesRouter);
  app.use("/v1/positions", positionsRouter);
  app.use("/v1/markets", marketsRouter);
  app.use("/v1/prices", pricesRouter);
  app.use("/v1/feedback", feedbackRouter);
  app.use("/v1/health", healthRouter);

  return app;
}
