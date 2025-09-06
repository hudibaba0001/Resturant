export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const body = await req.json();
  const target = new URL(`/api/dashboard/menus/items/${ctx.params.id}`, req.url);

  const resp = await fetch(target.toString(), {
    method: 'PATCH',
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

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const target = new URL(`/api/dashboard/menus/items/${ctx.params.id}`, req.url);

  const resp = await fetch(target.toString(), {
    method: 'DELETE',
    headers: {
      'X-Admin-Key': process.env.DASHBOARD_ADMIN_KEY ?? '',
    },
    cache: 'no-store',
  });

  const json = await resp.json().catch(() => ({}));
  return NextResponse.json(json, { status: resp.status });
}
