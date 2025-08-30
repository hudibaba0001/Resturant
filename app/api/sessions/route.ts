import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';

const Body = z.object({
  restaurantId: z.string().uuid(),
  locale: z.string().optional(),
});

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'api-sessions' } },
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  const ua = req.headers.get('user-agent') ?? '';
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'BAD_REQUEST', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { restaurantId, locale } = parsed.data;
  const sb = supabase();

  // 1) Validate restaurant & origin
  const { data: restaurant, error: rErr } = await sb
    .from('restaurants')
    .select('id, is_active, allowed_origins')
    .eq('id', restaurantId)
    .maybeSingle();

  if (rErr || !restaurant) {
    return NextResponse.json({ code: 'RESTAURANT_NOT_FOUND' }, { status: 404 });
  }
  if (!restaurant.is_active) {
    return NextResponse.json({ code: 'RESTAURANT_INACTIVE' }, { status: 403 });
  }
  if (Array.isArray(restaurant.allowed_origins) && restaurant.allowed_origins.length) {
    if (!origin || !restaurant.allowed_origins.includes(origin)) {
      return NextResponse.json({ code: 'ORIGIN_NOT_ALLOWED' }, { status: 403 });
    }
  }

  // 2) Mint token (+hash for future)
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex'); // optional future use

  // 3) Insert session (RLS must allow this insert)
  const { data: session, error: sErr } = await sb
    .from('widget_sessions')
    .insert({
      restaurant_id: restaurantId,
      session_token: token,
      // keep hash as well so we can migrate to hash-only later without breaking old tokens
      session_token_hash: Buffer.from(tokenHash, 'hex'),
      user_agent: ua,
      locale,
    })
    .select('id')
    .single();

  if (sErr) {
    return NextResponse.json({ code: 'DB_ERROR', detail: sErr.message }, { status: 500 });
  }

  const res = NextResponse.json({ sessionId: session.id, sessionToken: token });
  // Optional convenience cookie (no secrets)
  res.cookies.set('wsess', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
