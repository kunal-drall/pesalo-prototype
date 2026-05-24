import cors from "cors";
import express, { Request, Response } from "express";

import { attachExpressIntegration, initSentry } from "./observability/sentry";
import { activityRouter } from "./routes/activity";
import { earlyAccessRouter } from "./routes/earlyAccess";
import { earnRatesRouter } from "./routes/earnRates";
import { feedbackRouter } from "./routes/feedback";
import { healthRouter } from "./routes/health";
import { marketsRouter } from "./routes/markets";
import { positionsRouter } from "./routes/positions";
import { pricesRouter } from "./routes/prices";

// Sentry must be initialised before any HTTP handler is registered so its
// integrations can wrap inbound requests.
initSentry();

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);
  // Allow the landing site + dev origins. Wildcard would also work since
  // none of our endpoints accept credentials, but an explicit allow-list
  // makes abuse easier to spot.
  app.use(
    cors({
      origin: [
        "https://pesalo.fun",
        "https://www.pesalo.fun",
        "https://pesalo-app.vercel.app",
        /^https:\/\/pesalo-.+\.vercel\.app$/, // preview deploys
        "http://localhost:3000",
        "http://localhost:19006",
      ],
    }),
  );
  app.use(express.json({ limit: "64kb" }));

  app.use("/v1/earn-rates", earnRatesRouter);
  // Backwards-compat alias for older mobile builds until they update.
  app.use("/v1/rates", earnRatesRouter);
  app.use("/v1/positions", positionsRouter);
  app.use("/v1/markets", marketsRouter);
  app.use("/v1/prices", pricesRouter);
  app.use("/v1/activity", activityRouter);
  app.use("/v1/early-access", earlyAccessRouter);
  app.use("/v1/feedback", feedbackRouter);
  app.use("/v1/health", healthRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  attachExpressIntegration(app);
  return app;
}
