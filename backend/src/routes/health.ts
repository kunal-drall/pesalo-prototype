import { Router } from "express";

import { config, configuredFixedMarkets } from "../config";
import { rateService } from "../services/rateService";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const markets = configuredFixedMarkets();
  let contractsHealthy = markets.length > 0;
  let lastRateUpdate: string | null = null;

  if (markets.length > 0) {
    try {
      const rates = await rateService.getRates();
      contractsHealthy = rates.rates.length === markets.length;
      lastRateUpdate = rates.updatedAt;
    } catch {
      contractsHealthy = false;
    }
  }

  res.json({
    status: contractsHealthy ? "ok" : "degraded",
    contractsHealthy,
    oracleFresh: Boolean(config.reflectorContract),
    rpcUrl: config.sorobanRpcUrl,
    markets: markets.length,
    lastRateUpdate,
    updatedAt: new Date().toISOString(),
  });
});
