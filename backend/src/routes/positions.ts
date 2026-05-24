import { Router } from "express";

import { positionService } from "../services/positionService";

export const positionsRouter = Router();

positionsRouter.get("/:addr", async (req, res, next) => {
  try {
    res.json(await positionService.getPositions(req.params.addr));
  } catch (error) {
    next(error);
  }
});
