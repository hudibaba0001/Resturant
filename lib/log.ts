/**
 * Structured JSON logger for API routes
 * Greppable in Vercel logs with request ID tracking
 */

export function log(event: string, data: Record<string, unknown> = {}) {
  const rid = (global as any).__reqId || crypto.randomUUID();
  
  // Keep logs short and avoid PII
  const logEntry = {
    t: new Date().toISOString(),
    evt: event,
    rid,
    env: process.env.NODE_ENV,
    ...data
  };
  
  console.log(JSON.stringify(logEntry));
  return rid;
}

export function logError(event: string, error: Error, data: Record<string, unknown> = {}) {
  const rid = (global as any).__reqId || crypto.randomUUID();
  
  const logEntry = {
    t: new Date().toISOString(),
    evt: event,
    rid,
    env: process.env.NODE_ENV,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')[0] // First line only
    },
    ...data
  };
  
  console.error(JSON.stringify(logEntry));
  return rid;
}

export function logPerformance(event: string, durationMs: number, data: Record<string, unknown> = {}) {
  const rid = (global as any).__reqId || crypto.randomUUID();
  
  const logEntry = {
    t: new Date().toISOString(),
    evt: event,
    rid,
    env: process.env.NODE_ENV,
    duration_ms: durationMs,
    ...data
  };
  
  console.log(JSON.stringify(logEntry));
  return rid;
}

// Helper to set request ID from middleware
export function setRequestId(requestId: string) {
  (global as any).__reqId = requestId;
}

// Helper to get current request ID
export function getRequestId(): string {
  return (global as any).__reqId || 'unknown';
}
