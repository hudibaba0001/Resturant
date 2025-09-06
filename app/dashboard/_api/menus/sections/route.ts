export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const target = new URL('/api/dashboard/menus/sections', req.url);

  const resp = await fetch(target.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': process.env.DASHBOARD_ADMIN_KEY ?? '',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = await resp.json().catch(() => ({}));
  return NextResponse.json(json, { status: resp.status });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = new URL('/api/dashboard/menus/sections', req.url);
  target.search = url.search; // Copy query parameters

  const resp = await fetch(target.toString(), {
    method: 'GET',
    headers: {
      'X-Admin-Key': process.env.DASHBOARD_ADMIN_KEY ?? '',
    },
    cache: 'no-store',
  });

  const json = await resp.json().catch(() => ({}));
  return NextResponse.json(json, { status: resp.status });
}
