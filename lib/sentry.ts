import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
      // Only capture errors in production
      enabled: process.env.NODE_ENV === 'production',
    });
  }
}
