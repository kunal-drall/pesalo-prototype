import { Router } from "express";

import { rateService } from "../services/rateService";

export const marketsRouter = Router();

marketsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await rateService.getMarkets());
  } catch (error) {
    next(error);
  }
});
