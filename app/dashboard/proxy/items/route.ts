import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ADMIN = process.env.DASHBOARD_ADMIN_KEY!;

function upstreamUrl(req: NextRequest, path: string = '') {
  // Build absolute URL against the same origin
  return new URL(`/api/dashboard/items${path}`, req.nextUrl).toString();
}

async function passthrough(res: Response) {
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest) {
  const res = await fetch(upstreamUrl(req, req.nextUrl.search), {
    method: "GET",
    headers: { "X-Admin-Key": ADMIN },
    cache: "no-store",
  });
  return passthrough(res);
}

export async function POST(req: NextRequest) {
  // Forward raw body; let the upstream do body validation
  const body = await req.text();
  const res = await fetch(upstreamUrl(req), {
    method: "POST",
    headers: {
      "Content-Type": req.headers.get("content-type") ?? "application/json",
      "X-Admin-Key": ADMIN,
    },
    body,
    cache: "no-store",
  });
  return passthrough(res);
}
