// app/dashboard/_api/menus/sections/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function apiUrl(request: Request) {
  // keep same host, just swap the pathname
  const url = new URL(request.url);
  url.pathname = "/api/dashboard/menus/sections";
  return url.toString();
}

function adminHeaders() {
  const key = process.env.DASHBOARD_ADMIN_KEY;
  if (!key) {
    return null;
  }
  return { "X-Admin-Key": key };
}

export async function GET(request: Request) {
  const headers = adminHeaders();
  if (!headers) {
    return NextResponse.json({ code: "SERVER_MISCONFIG", missing: ["DASHBOARD_ADMIN_KEY"] }, { status: 500 });
  }

  const res = await fetch(apiUrl(request), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const body = await res.text(); // pass-through
  return new NextResponse(body, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}

export async function POST(request: Request) {
  const headers = adminHeaders();
  if (!headers) {
    return NextResponse.json({ code: "SERVER_MISCONFIG", missing: ["DASHBOARD_ADMIN_KEY"] }, { status: 500 });
  }

  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
  }

  const res = await fetch(apiUrl(request), {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(json),
    cache: "no-store",
  });

  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}
