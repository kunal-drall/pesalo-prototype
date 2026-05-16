import cors from "cors";
import express, { NextFunction, Request, Response } from "express";

import { activityRouter } from "./routes/activity";
import { feedbackRouter } from "./routes/feedback";
import { healthRouter } from "./routes/health";
import { marketsRouter } from "./routes/markets";
import { positionsRouter } from "./routes/positions";
import { pricesRouter } from "./routes/prices";
import { ratesRouter } from "./routes/rates";

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[server]", err);
    res
      .status(500)
      .json({ error: err.message || "Internal Server Error", correlationId: requestId() });
  });

  return app;
}

function requestId(): string {
  return Math.random().toString(36).slice(2, 10);
}
