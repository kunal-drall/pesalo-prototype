import { Router } from "express";

import { priceService } from "../services/priceService";

export const pricesRouter = Router();

pricesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await priceService.getPrices());
  } catch (error) {
    next(error);
  }
});
