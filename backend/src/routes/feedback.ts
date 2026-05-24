import { Router } from "express";

import { feedbackService } from "../services/feedbackService";

export const feedbackRouter = Router();

feedbackRouter.post("/", async (req, res, next) => {
  try {
    const saved = await feedbackService.saveFeedback(req.body);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});
