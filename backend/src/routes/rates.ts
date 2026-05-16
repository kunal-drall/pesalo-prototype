import { Router } from "express";

import { rateService } from "../services/rateService";

export const ratesRouter = Router();

ratesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await rateService.getRates());
  } catch (error) {
    next(error);
  }
});
