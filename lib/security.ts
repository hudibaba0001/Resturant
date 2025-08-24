export function pickOrigin(req: Request) {
  return req.headers.get('origin') || '';
}
export function withCorsHeaders(origin: string, extra: Record<string,string> = {}) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Widget-Version',
    ...extra,
  };
}
export function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}
