// app/api/dashboard/orders/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const Q = z.object({
  restaurantId: z.string().uuid(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().uuid().nullish(),
});

export async function GET(req: NextRequest) {
  // 1) Admin auth
  const adminKeyEnv = process.env.DASHBOARD_ADMIN_KEY;
  if (!adminKeyEnv) {
    return NextResponse.json(
      { code: 'SERVER_MISCONFIG', missing: { DASHBOARD_ADMIN_KEY: true } },
      { status: 500 }
    );
  }
  const provided = req.headers.get('x-admin-key');
  if (provided !== adminKeyEnv) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }

  // 2) Query validation
  const { searchParams } = new URL(req.url);
  const parsed = Q.safeParse({
    restaurantId: searchParams.get('restaurantId'),
    limit: searchParams.get('limit') ?? undefined,
    cursor: searchParams.get('cursor'),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'BAD_REQUEST', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { restaurantId, limit, cursor } = parsed.data;

  // 3) Supabase (service role)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  // 4) Cursor pagination by created_at
  let query = supabase
    .from('orders')
    .select('id, created_at, order_code, status, total_cents, currency', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    const { data: cur } = await supabase
      .from('orders')
      .select('created_at')
      .eq('id', cursor)
      .maybeSingle();
    if (cur?.created_at) query = query.lt('created_at', cur.created_at);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ code: 'DB_ERROR', message: error.message }, { status: 500 });
  }

  const nextCursor = data?.[data.length - 1]?.id ?? null;
  return NextResponse.json({ orders: data, nextCursor });
}
