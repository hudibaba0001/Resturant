import { NextResponse } from 'next/server';

function internal(url: string, req: Request) {
  const origin = new URL(req.url).origin;
  return new URL(url, origin);
}

async function forward(method: string, req: Request, path: string) {
  const body = method === 'PATCH' || method === 'PUT' || method === 'POST' ? await req.text() : null;
  const res = await fetch(internal(path, req), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': process.env.DASHBOARD_ADMIN_KEY!,
    },
    body,
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return forward('PATCH', req, `/api/dashboard/menus/sections/${params.id}`);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return forward('DELETE', req, `/api/dashboard/menus/sections/${params.id}`);
}
