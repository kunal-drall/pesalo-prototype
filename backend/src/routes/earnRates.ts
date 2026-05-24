import { Router } from "express";

import { rateService } from "../services/rateService";

export const earnRatesRouter = Router();

earnRatesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await rateService.getRates());
  } catch (error) {
    next(error);
  }
});
