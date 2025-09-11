import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN = process.env.DASHBOARD_ADMIN_KEY!;

function upstreamUrl(req: NextRequest, slug: string[]) {
  // Build absolute URL against the same origin
  const path = slug.length > 0 ? `/${slug.join('/')}` : '';
  return new URL(`/api/dashboard/items${path}`, req.nextUrl).toString();
}

async function passthrough(res: Response) {
  const status = res.status;
  const headers = new Headers(res.headers);
  // No body allowed for 204/304 in NextResponse
  if (status === 204 || status === 304) {
    return new NextResponse(null, { status, headers });
  }
  const body = await res.text();
  return new NextResponse(body, {
    status,
    headers: { "content-type": headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const res = await fetch(upstreamUrl(req, params.slug) + req.nextUrl.search, {
    method: "GET",
    headers: { "X-Admin-Key": ADMIN },
    cache: "no-store",
  });
  return passthrough(res);
}

export async function POST(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const method = req.method;
  const contentLength = req.headers.get("content-length") ?? "0";
  const hasBody = !["GET", "HEAD"].includes(method) && contentLength !== "0";
  const bodyText = hasBody ? await req.text() : undefined;
  const res = await fetch(upstreamUrl(req, params.slug), {
    method: "POST",
    headers: {
      "Content-Type": req.headers.get("content-type") ?? "application/json",
      "X-Admin-Key": ADMIN,
    },
    body: (bodyText ?? null) as BodyInit | null,
    redirect: "manual",
    cache: "no-store",
  });
  return passthrough(res);
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const method = req.method;
  const contentLength = req.headers.get("content-length") ?? "0";
  const hasBody = !["GET", "HEAD"].includes(method) && contentLength !== "0";
  const bodyText = hasBody ? await req.text() : undefined;
  const res = await fetch(upstreamUrl(req, params.slug), {
    method: "PATCH",
    headers: {
      "Content-Type": req.headers.get("content-type") ?? "application/json",
      "X-Admin-Key": ADMIN,
    },
    body: (bodyText ?? null) as BodyInit | null,
    redirect: "manual",
    cache: "no-store",
  });
  return passthrough(res);
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const res = await fetch(upstreamUrl(req, params.slug), {
    method: "DELETE",
    headers: { "X-Admin-Key": ADMIN },
    redirect: "manual",
    cache: "no-store",
  });
  return passthrough(res);
}
