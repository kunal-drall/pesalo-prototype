import * as Sentry from "@sentry/react-native";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

let initialised = false;

/// Initialize Sentry once at app boot. No-op if no DSN is configured so the
/// app keeps working in local dev without polluting an external project.
export function initSentry(): void {
  if (initialised || !DSN) return;
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.2,
    enableNative: true,
    enableAutoSessionTracking: true,
    enableNativeCrashHandling: true,
    enableNativeNagger: false,
    // Mask anything that looks like an address or key in breadcrumbs.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) {
        breadcrumb.message = breadcrumb.message.replace(/G[A-Z2-7]{55}/g, "G…");
      }
      return breadcrumb;
    },
    beforeSend(event) {
      // Strip user-identifying request paths so wallet addresses don't leak.
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/G[A-Z2-7]{55}/g, "G…");
      }
      return event;
    },
  });
  initialised = true;
}

export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (!initialised) return;
  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(err);
  });
}

export function setUserContext(walletAddress: string | null): void {
  if (!initialised) return;
  if (walletAddress) {
    // Only the first 4 + last 4 characters — never the full address.
    const masked = `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`;
    Sentry.setUser({ id: masked });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
