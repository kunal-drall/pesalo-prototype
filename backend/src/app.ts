import cors from "cors";
import express, { Request, Response } from "express";

import { attachExpressIntegration, initSentry } from "./observability/sentry";
import { activityRouter } from "./routes/activity";
import { feedbackRouter } from "./routes/feedback";
import { healthRouter } from "./routes/health";
import { marketsRouter } from "./routes/markets";
import { positionsRouter } from "./routes/positions";
import { pricesRouter } from "./routes/prices";
import { ratesRouter } from "./routes/rates";

// Sentry must be initialised before any HTTP handler is registered so its
// integrations can wrap inbound requests.
initSentry();

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "64kb" }));

  app.use("/v1/rates", ratesRouter);
  app.use("/v1/positions", positionsRouter);
  app.use("/v1/markets", marketsRouter);
  app.use("/v1/prices", pricesRouter);
  app.use("/v1/activity", activityRouter);
  app.use("/v1/feedback", feedbackRouter);
  app.use("/v1/health", healthRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  attachExpressIntegration(app);
  return app;
}
