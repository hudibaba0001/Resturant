import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',    // EU DSN
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  profilesSampleRate: 0,                // keep off unless needed
  
  // Privacy-first: scrub PII from all events
  beforeSend(event) {
    // Scrub potential PII in messages/extra
    const redact = (s?: string) => {
      if (!s) return s;
      return s
        .replace(/\+?[0-9][0-9\s\-()]{7,}/g, '[redacted-phone]')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted-email]')
        .replace(/[A-Za-z]+ [A-Za-z]+/g, '[redacted-name]'); // Simple name pattern
    };
    
    if (event.message) {
      event.message = redact(event.message) || event.message;
    }
    
    if (event.request && event.request.data) {
      event.request.data = '[redacted]';
    }
    
    // Scrub any custom data that might contain PII
    if (event.extra) {
      Object.keys(event.extra).forEach(key => {
        if (typeof event.extra![key] === 'string') {
          event.extra![key] = redact(event.extra![key]);
        }
      });
    }
    
    return event;
  },
  
  // Environment-specific settings
  environment: process.env.NODE_ENV,
  
  // Only capture errors in production, full traces in development
  debug: process.env.NODE_ENV === 'development',
  
  // Integrations
  integrations: [
    // Add any specific integrations here if needed
  ],
  
  // Performance monitoring is enabled by default
  
  // Ignore certain errors that are expected
  ignoreErrors: [
    // Network errors that are expected
    'Network Error',
    'Failed to fetch',
    // Browser-specific errors
    'ResizeObserver loop limit exceeded',
  ],
});
