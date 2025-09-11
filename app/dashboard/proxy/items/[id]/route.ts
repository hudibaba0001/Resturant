import type { NextRequest } from "next/server";
// Note: Proxy normalizes 204/304 responses to no-body and forwards X-Admin-Key
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_KEY = process.env.DASHBOARD_ADMIN_KEY || process.env.ADMIN_KEY;

function mapTarget(req: NextRequest, id: string): URL {
  const incoming = new URL(req.url);
  return new URL(
    `/api/dashboard/items/${id}${incoming.search}`,
    `${incoming.protocol}//${incoming.host}`
  );
}

async function handle(req: NextRequest, { params }: { params: { id: string } }) {
  const target = mapTarget(req, params.id);

  const headers = new Headers(req.headers);
  headers.set("X-Admin-Key", ADMIN_KEY ?? "");
  headers.delete("cookie");
  headers.delete("host");
  headers.set("accept", headers.get("accept") || "application/json");

  const method = req.method;
  const contentLength = headers.get("content-length") ?? "0";
  const hasBody = !["GET", "HEAD"].includes(method) && contentLength !== "0";

  // Read body text only when present to satisfy RequestInit typing
  const bodyText = hasBody ? await req.text() : undefined;

  const upstream = await fetch(target, {
    method,
    headers,
    body: (bodyText ?? null) as BodyInit | null,
    redirect: "manual",
    cache: "no-store",
  });

  const status = upstream.status;
  const outHeaders = new Headers(upstream.headers);
  // No body for 204/304
  if (status === 204 || status === 304) {
    return new NextResponse(null, { status, headers: outHeaders });
  }
  const text = await upstream.text();
  return new NextResponse(text, { status, headers: outHeaders });
}

export const GET = handle;
export const PATCH = handle;
export const DELETE = handle;
