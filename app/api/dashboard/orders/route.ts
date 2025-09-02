export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminKey    = process.env.DASHBOARD_ADMIN_KEY!; // <-- add this in Vercel

const QuerySchema = z.object({
  restaurantId: z.string().uuid(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().uuid().optional(), // for pagination by created_at,id
  status: z.enum(['pending','confirmed','preparing','ready','completed','cancelled']).optional()
});

export async function GET(req: Request) {
  // --- Auth (MVP): static admin key header. Replace with Clerk/Auth0 later.
  const adminHeader = req.headers.get('x-admin-key') ?? '';
  if (!adminKey || adminHeader !== adminKey) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ code: 'SERVER_MISCONFIG' }, { status: 500 });
  }

  const url = new URL(req.url);
  const parse = QuerySchema.safeParse({
    restaurantId: url.searchParams.get('restaurantId'),
    limit: url.searchParams.get('limit') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    status: url.searchParams.get('status') ?? undefined
  });
  if (!parse.success) {
    return NextResponse.json({ code: 'BAD_REQUEST', issues: parse.error.issues }, { status: 400 });
  }
  const { restaurantId, limit, cursor, status } = parse.data;

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Pagination rule: created_at DESC, id tie-breaker (seek pagination)
  // If cursor provided, fetch rows created_at < cursor_created_at OR (equal and id < cursor_id)
  let createdAtCutoff: string | null = null;
  let idCutoff: string | null = null;

  if (cursor) {
    // Fetch cursor row timestamps
    const { data: cur, error: curErr } = await supabase
      .from('orders')
      .select('id, created_at')
      .eq('id', cursor)
      .single();
    if (curErr) return NextResponse.json({ code: 'CURSOR_NOT_FOUND' }, { status: 400 });
    createdAtCutoff = cur.created_at;
    idCutoff = cur.id;
  }

  // Fetch orders
  let ordersQuery = supabase
    .from('orders')
    .select('id, order_code, total_cents, currency, status, type, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (status) ordersQuery = ordersQuery.eq('status', status);

  if (createdAtCutoff && idCutoff) {
    // emulate (created_at, id) < (cutoff)
    ordersQuery = ordersQuery.lt('created_at', createdAtCutoff)
      .or(`and(created_at.eq.${createdAtCutoff},id.lt.${idCutoff})`);
  }

  const { data: orders, error: ordersErr } = await ordersQuery;
  if (ordersErr) {
    return NextResponse.json({ code: 'DB_ERROR', detail: ordersErr.message }, { status: 500 });
  }
  if (!orders || orders.length === 0) {
    return NextResponse.json({ orders: [], nextCursor: null });
  }

  const ids = orders.map(o => o.id);
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('order_id, item_id, qty, price_cents')
    .in('order_id', ids);
  if (itemsErr) {
    return NextResponse.json({ code: 'DB_ERROR', detail: itemsErr.message }, { status: 500 });
  }

  // Group items by order_id
  const byOrder: Record<string, any[]> = {};
  for (const it of items ?? []) {
    (byOrder[it.order_id] ||= []).push({
      itemId: it.item_id,
      qty: it.qty,
      price_cents: it.price_cents
    });
  }

  const result = orders.map(o => ({
    id: o.id,
    orderCode: o.order_code,
    totalCents: o.total_cents,
    currency: o.currency,
    status: o.status,
    type: o.type,
    createdAt: o.created_at,
    items: byOrder[o.id] ?? []
  }));

  const lastOrder = orders[orders.length - 1];
  const nextCursor = orders.length === limit && lastOrder ? lastOrder.id : null;

  return NextResponse.json({ orders: result, nextCursor });
}
