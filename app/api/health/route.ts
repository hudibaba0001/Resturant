// Node runtime for Supabase
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const checks: Record<string, any> = {
      uptime_s: Math.floor(process.uptime()),
      env: {
        supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY,
        stripe: !!process.env.STRIPE_SECRET_KEY,
      },
    };
    return NextResponse.json({ ok: true, checks });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
