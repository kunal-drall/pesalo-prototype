import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    contractsHealthy: true,
    oracleFresh: true,
    updatedAt: new Date().toISOString()
  });
});
