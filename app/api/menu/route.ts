export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

// Simple pass-through to the new public route to avoid breaking old clients.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const r = await fetch(new URL('/api/public/menu', url.origin).toString() + '?' + url.searchParams.toString(), {
    method: 'GET',
    headers: { 'x-internal-proxy': '1' },
    cache: 'no-store',
  });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') || 'application/json' },
  });
}
