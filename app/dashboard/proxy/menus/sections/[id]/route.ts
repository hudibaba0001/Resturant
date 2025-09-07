import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function adminHeaders() {
  const key = process.env.DASHBOARD_ADMIN_KEY;
  if (!key) return null;
  return { "X-Admin-Key": key };
}

function targetUrl(req: Request, id: string) {
  const url = new URL(req.url);
  url.pathname = `/api/dashboard/menus/sections/${id}`;
  return url.toString();
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const headers = adminHeaders();
  if (!headers) {
    return NextResponse.json(
      { code: "SERVER_MISCONFIG", missing: ["DASHBOARD_ADMIN_KEY"] },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
  }

  const res = await fetch(targetUrl(request, params.id), {
    method: "PATCH",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const headers = adminHeaders();
  if (!headers) {
    return NextResponse.json(
      { code: "SERVER_MISCONFIG", missing: ["DASHBOARD_ADMIN_KEY"] },
      { status: 500 }
    );
  }

  const res = await fetch(targetUrl(request, params.id), {
    method: "DELETE",
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
