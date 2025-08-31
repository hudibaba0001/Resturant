export function safeErr(code = 'INTERNAL_ERROR', status = 500) {
  return { code, status };
}

export function jsonError(code: string, status = 400, extra?: Record<string, unknown>) {
  // In production we avoid echoing arbitrary fields back to clients.
  const isProd = process.env.NODE_ENV === 'production';
  const safe = isProd ? undefined : extra;
  const body = safe ? { code, ...safe } : { code };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function sanitizeError(error: any): string {
  // Log the full error server-side for debugging
  console.error('Internal error:', error);
  
  // Return safe error message to client
  if (error?.code && typeof error.code === 'string') {
    return error.code;
  }
  return 'INTERNAL_ERROR';
}

/**
 * Returns a client-safe message for a given code.
 * - In dev: include the original message to speed debugging.
 * - In prod: return a friendly, non-sensitive string.
 */
export function sanitizeErrorMessage(code: string, err: unknown) {
  const dev = process.env.NODE_ENV !== 'production';
  if (dev) {
    const msg =
      (err as any)?.message ??
      (typeof err === 'string' ? err : 'Unexpected error');
    return msg;
  }
  const map: Record<string, string> = {
    MENU_LOOKUP_ERROR: 'Menu temporarily unavailable',
    ORDER_INSERT_ERROR: 'Order processing failed',
    LINE_INSERT_ERROR: 'Order processing failed',
    INTERNAL_ERROR: 'Internal server error',
  };
  return map[code] || 'Internal server error';
}

/**
 * Wrap a route handler and guarantee sanitized error responses.
 * Example:
 *   export const POST = safeRoute(async (req) => { ... }, 'INTERNAL_ERROR')
 */
export function safeRoute(
  fn: (req: Request) => Promise<Response>,
  codeOnError = 'INTERNAL_ERROR'
) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (err) {
      const message = sanitizeErrorMessage(codeOnError, err);
      return jsonError(codeOnError, 500, { message });
    }
  };
}
