import * as Sentry from "@sentry/node";
import type { Application, ErrorRequestHandler, Request, Response } from "express";

const DSN = process.env.SENTRY_DSN ?? "";
const ENVIRONMENT = process.env.NODE_ENV ?? "development";

let initialised = false;

export function initSentry(): void {
  if (initialised || !DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: 0.1,
    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/G[A-Z2-7]{55}/g, "G…");
      }
      return event;
    },
  });
  initialised = true;
}

/// Sentry v10 lazy-attaches an Express error handler via setupExpressErrorHandler.
/// We always install our own JSON error responder after Sentry's middleware so
/// callers get a sanitized payload instead of an HTML stack trace.
export function attachExpressIntegration(app: Application): void {
  if (initialised) {
    Sentry.setupExpressErrorHandler(app);
  }
  app.use(jsonErrorHandler);
}

const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[server]", err);
  respondWithError(err, _req, res);
};

function respondWithError(err: Error, _req: Request, res: Response): void {
  res.status(500).json({
    error: err.message || "Internal Server Error",
    correlationId: Math.random().toString(36).slice(2, 10),
  });
}

export { Sentry };
