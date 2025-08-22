export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/onboard?error=missing_code`);

  // Create response we will return
  const res = NextResponse.redirect(`${origin}/dashboard/menu?welcome=true&pending=restaurant`);

  // Bridge cookies between req <-> res
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) => res.cookies.set({ name, value: '', ...options, maxAge: 0 }),
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/onboard?error=${encodeURIComponent(error.message)}`
    );
  }

  return res;
}

export async function POST(req: NextRequest) {
  const { event, session } = await req.json().catch(() => ({}));

  // 1) Create ONE response we will return
  const res = NextResponse.json({ ok: true });

  // 2) Bridge cookies between req <-> res (critical!)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) => res.cookies.set({ name, value: '', ...options, maxAge: 0 }),
      },
    }
  );

  // 3) Set or clear the session (this will mutate `res.cookies`)
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token ?? '',
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  
  if (event === 'SIGNED_OUT') {
    await supabase.auth.signOut();
  }

  // 4) Return THE SAME `res` that has Set-Cookie
  return res;
}
