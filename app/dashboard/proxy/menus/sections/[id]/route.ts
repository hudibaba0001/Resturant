import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ZId = z.object({ id: z.string().uuid() });
const ADMIN = process.env.DASHBOARD_ADMIN_KEY!;

function upstreamUrl(req: NextRequest, id: string) {
  // Build absolute URL against the same origin
  return new URL(`/api/dashboard/menus/sections/${id}`, req.nextUrl).toString();
}

async function passthrough(res: Response) {
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const v = ZId.safeParse(params);
  if (!v.success) {
    return NextResponse.json({ code: "INVALID_INPUT", issues: v.error.issues }, { status: 400 });
  }

  // Forward raw body; let the upstream do body validation & existence check
  const body = await req.text();
  const res = await fetch(upstreamUrl(req, params.id), {
    method: "PATCH",
    headers: {
      "Content-Type": req.headers.get("content-type") ?? "application/json",
      "X-Admin-Key": ADMIN,
    },
    body,
    cache: "no-store",
  });
  return passthrough(res);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const v = ZId.safeParse(params);
  if (!v.success) {
    return NextResponse.json({ code: "INVALID_INPUT", issues: v.error.issues }, { status: 400 });
  }

  const res = await fetch(upstreamUrl(req, params.id), {
    method: "DELETE",
    headers: { "X-Admin-Key": ADMIN },
    cache: "no-store",
  });
  return passthrough(res);
}
