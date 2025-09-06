import { NextResponse } from 'next/server';

const ADMIN = process.env.DASHBOARD_ADMIN_KEY!;
function apiUrl(req: Request, path: string) {
  return new URL(path, new URL(req.url).origin).toString();
}

export async function GET(req: Request) {
  const urlIn  = new URL(req.url);
  const urlOut = new URL(apiUrl(req, '/api/dashboard/menus/sections'));
  // pass through all query params (restaurant_id | menu_id)
  urlIn.searchParams.forEach((v, k) => urlOut.searchParams.set(k, v));

  const r = await fetch(urlOut, { headers: { 'X-Admin-Key': ADMIN } });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}

export async function POST(req: Request) {
  const body = await req.text(); // don't assume JSON always; pass-thru
  const r = await fetch(apiUrl(req, '/api/dashboard/menus/sections'), {
    method: 'POST',
    headers: { 'X-Admin-Key': ADMIN, 'content-type': 'application/json' },
    body,
  });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}
