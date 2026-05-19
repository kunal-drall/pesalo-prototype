import { Router } from "express";

import {
  earlyAccessService,
  InvalidEmailError,
} from "../services/earlyAccessService";

export const earlyAccessRouter = Router();

earlyAccessRouter.post("/", async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as {
      email?: unknown;
      source?: unknown;
    };
    if (typeof body.email !== "string") {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const source = typeof body.source === "string" ? body.source : "landing";
    const ip =
      (req.headers["x-forwarded-for"]?.toString().split(",")[0] ?? req.ip)
        ?.trim() || undefined;
    const userAgent = req.headers["user-agent"]?.toString();

    await earlyAccessService.register({
      email: body.email,
      source,
      userAgent,
      ip,
    });
    // Always respond 200 regardless of whether the email already existed —
    // this prevents email-enumeration via the API.
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidEmailError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

earlyAccessRouter.get("/count", async (_req, res, next) => {
  try {
    res.json({ count: await earlyAccessService.count() });
  } catch (err) {
    next(err);
  }
});
