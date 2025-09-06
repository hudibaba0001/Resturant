import { NextResponse } from 'next/server';

const ADMIN = process.env.DASHBOARD_ADMIN_KEY!;
const mk = (req: Request, p: string) => new URL(p, new URL(req.url).origin).toString();

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  const r = await fetch(mk(req, `/api/dashboard/menus/sections/${params.id}`), {
    method: 'PATCH',
    headers: { 'X-Admin-Key': ADMIN, 'content-type': 'application/json' },
    body,
  });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const r = await fetch(mk(req, `/api/dashboard/menus/sections/${params.id}`), {
    method: 'DELETE',
    headers: { 'X-Admin-Key': ADMIN },
  });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}
