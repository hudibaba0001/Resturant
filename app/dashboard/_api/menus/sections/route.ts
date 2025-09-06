import { NextResponse } from 'next/server';

function internal(url: string, req: Request) {
  const origin = new URL(req.url).origin;
  return new URL(url, origin);
}

async function forward(method: string, req: Request, path: string) {
  const body = method === 'GET' || method === 'HEAD' ? null : await req.text();
  const res = await fetch(internal(path, req), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': process.env.DASHBOARD_ADMIN_KEY!, // server-only
    },
    body,
    // stay same-origin; cookies not needed since we're injecting key
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(req: Request) {
  const q = new URL(req.url).search; // passes ?restaurant_id=... or ?menu_id=...
  return forward('GET', req, `/api/dashboard/menus/sections${q}`);
}

export async function POST(req: Request) {
  return forward('POST', req, '/api/dashboard/menus/sections');
}
