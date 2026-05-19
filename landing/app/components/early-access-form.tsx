"use client";

import { FormEvent, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://pesalo-api-production.up.railway.app/v1";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function EarlyAccessForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({ kind: "error", message: "Enter your email to continue." });
      return;
    }

    setStatus({ kind: "submitting" });

    try {
      const response = await fetch(`${API_URL}/early-access`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "landing" }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          typeof (payload as { error?: string }).error === "string"
            ? (payload as { error: string }).error
            : "We couldn't add you. Try again in a moment.";
        setStatus({ kind: "error", message });
        return;
      }

      setStatus({ kind: "success" });
      setEmail("");
    } catch {
      setStatus({
        kind: "error",
        message: "Network hiccup. Try again in a moment.",
      });
    }
  }

  const submitting = status.kind === "submitting";

  return (
    <form className="early-access-form" onSubmit={handleSubmit} noValidate>
      <div className="early-access-row">
        <label className="visually-hidden" htmlFor="early-access-email">
          Email address
        </label>
        <input
          id="early-access-email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status.kind === "error") setStatus({ kind: "idle" });
          }}
          disabled={submitting || status.kind === "success"}
          className="early-access-input"
          aria-invalid={status.kind === "error"}
          aria-describedby="early-access-feedback"
        />
        <button
          type="submit"
          className="button early-access-submit"
          disabled={submitting || status.kind === "success"}
        >
          {submitting
            ? "Adding…"
            : status.kind === "success"
              ? "You're on the list"
              : "Request early access"}
        </button>
      </div>
      <div
        id="early-access-feedback"
        className={`early-access-feedback ${
          status.kind === "error"
            ? "is-error"
            : status.kind === "success"
              ? "is-success"
              : ""
        }`}
        role="status"
        aria-live="polite"
      >
        {status.kind === "error"
          ? status.message
          : status.kind === "success"
            ? "We'll email you the moment Pesalo opens."
            : "No spam. One email when we're ready for testers."}
      </div>
    </form>
  );
}
