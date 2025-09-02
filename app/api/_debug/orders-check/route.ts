export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const Q = z.object({
  restaurantId: z.string().uuid(),
  sessionToken: z.string(),
  itemId: z.string().uuid().optional(),
});

function getServerSupabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server secret (must be set in Vercel)
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return supabase;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Q.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ code: 'BAD_QUERY', errors: parsed.error.flatten() }, { status: 400 });
  }
  const { restaurantId, sessionToken, itemId } = parsed.data;

  // Gather headers the guard might use
  const hdr = (name: string) => req.headers.get(name) ?? null;
  const host   = hdr('x-forwarded-host') || hdr('host') || '';
  const origin = hdr('origin') || '';
  const referer = hdr('referer') || '';

  const candidates = Array.from(new Set(
    [origin, referer, host, origin.replace(/\/$/, ''), referer.replace(/\/$/, '')]
      .filter(Boolean)
  ));

  const supabase = getServerSupabase();

  // Read restaurant
  const { data: r, error: rErr } = await supabase
    .from('restaurants')
    .select('id, slug, is_active, is_verified, allowed_origins')
    .eq('id', restaurantId)
    .maybeSingle();

  // Read session
  const { data: s, error: sErr } = await supabase
    .from('widget_sessions')
    .select('session_token, restaurant_id, origin')
    .eq('session_token', sessionToken)
    .maybeSingle();

  // Read item (optional)
  let i: any = null, iErr: any = null;
  if (itemId) {
    const res = await supabase
      .from('menu_items_v2')
      .select('id, restaurant_id')
      .eq('id', itemId)
      .maybeSingle();
    i = res.data; iErr = res.error;
  }

  // Booleans like a typical guard
  const restaurantOk = !!r && r.id === restaurantId;
  const restaurantLive = !!r && (r.is_active ?? true) && (r.is_verified ?? false);
  const originMatch = !!r && (r.allowed_origins ?? []).some((o: string) => candidates.includes(o));
  const sessionOk = !!s && s.restaurant_id === restaurantId;
  const sessionOriginOk = !!s && !!s.origin && candidates.includes(s.origin);
  const itemOk = itemId ? (!!i && i.restaurant_id === restaurantId) : true;

  return NextResponse.json({
    headers: { host, origin, referer },
    candidates,
    checks: {
      restaurantOk,
      restaurantLive,
      originMatch,
      sessionOk,
      sessionOriginOk,
      itemOk,
    },
    restaurant: r ?? null,
    session: s ?? null,
    item: i ?? null,
    errors: { rErr: rErr?.message ?? null, sErr: sErr?.message ?? null, iErr: iErr?.message ?? null },
  });
}
