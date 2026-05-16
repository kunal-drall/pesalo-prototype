import { Router } from "express";

import { eventService } from "../services/eventService";

export const activityRouter = Router();

activityRouter.get("/:address", async (req, res, next) => {
  try {
    const payload = await eventService.getActivityFor(req.params.address);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});
