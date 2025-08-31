export function corsHeaders(origin?: string, allowlist: string[] = []) {
  const isAllowed = origin && allowlist.some(a => a.toLowerCase() === origin.toLowerCase());
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : allowlist[0] || 'https://resturant.vercel.app',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}
