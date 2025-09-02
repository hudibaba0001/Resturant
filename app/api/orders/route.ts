export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Build a stable list of header candidates (advisory only)
function candidatesFromHeaders(req: Request) {
  const h = (n: string) => req.headers.get(n) ?? '';
  const host    = h('x-forwarded-host') || h('host');
  const origin  = h('origin');
  const referer = h('referer');
  return Array.from(new Set(
    [origin, referer, host, origin?.replace(/\/$/, ''), referer?.replace(/\/$/, '')].filter(Boolean)
  ));
}

// Robust input parser: JSON first, then query fallback (so curl/PowerShell can test)
async function parseBodyOrQuery(req: Request) {
  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      const raw = await req.text();             // safer than req.json() if upstream read the stream
      if (raw) {
        const body = JSON.parse(raw);
        if (body && typeof body === 'object') return body;
      }
    }
  } catch {}
  const url = new URL(req.url);
  const restaurantId = url.searchParams.get('restaurantId');
  const sessionToken = url.searchParams.get('sessionToken');
  const type = url.searchParams.get('type') ?? 'pickup';
  const itemsQP = url.searchParams.get('items'); // JSON-encoded
  let items: any[] = [];
  try { if (itemsQP) items = JSON.parse(itemsQP); } catch {}
  if (restaurantId && sessionToken) return { restaurantId, sessionToken, type, items };
  return null;
}

function genOrderCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;
  const ct = req.headers.get('content-type') || '';

  let body: any = null;
  if (ct.includes('application/json')) {
    try { body = await req.json(); } catch { /* ignore */ }
  }

  const restaurantId = body?.restaurantId ?? q.get('restaurantId');
  const sessionToken = body?.sessionToken ?? q.get('sessionToken');
  const type         = body?.type         ?? q.get('type') ?? 'pickup';
  const itemsRaw     = body?.items        ?? q.get('items');
  const items = Array.isArray(itemsRaw) ? itemsRaw
    : (typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : null);

  if (!restaurantId || !sessionToken || !type || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { code: 'BAD_REQUEST', reason: 'INVALID_INPUT' },
      { status: 400 },
    );
  }

  const rid   = restaurantId as string;
  const tok   = sessionToken as string;
  const cands = candidatesFromHeaders(req);

  // 2) Service-role Supabase client (server-only envs)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ code: 'SERVER_MISCONFIG', missing: { supabaseUrl: !supabaseUrl, supabaseKey: !supabaseKey } }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3) Read tenant + session (data-driven, not brittle headers)
  const { data: r } = await supabase
    .from('restaurants')
    .select('id, is_active, is_verified, allowed_origins')
    .eq('id', rid)
    .maybeSingle();

  const { data: s } = await supabase
    .from('widget_sessions')
    .select('id, session_token, restaurant_id, origin')
    .eq('session_token', tok)
    .maybeSingle();

  // Optional sanity: first item belongs to same restaurant
  let firstItem: { id: string; restaurant_id: string } | null = null;
  if (items[0]?.itemId) {
    const res = await supabase
      .from('menu_items_v2')
      .select('id, restaurant_id')
      .eq('id', items[0].itemId)
      .maybeSingle();
    firstItem = res.data as any;
  }

  const checks = {
    restaurantOk:   !!r && r.id === rid,
    restaurantLive: !!r && (r.is_active ?? true) && (r.is_verified ?? false),
    sessionOk:      !!s && s.restaurant_id === rid,
    itemOk:         firstItem ? firstItem.restaurant_id === rid : true,
  };

  if (!checks.restaurantOk || !checks.restaurantLive || !checks.sessionOk || !checks.itemOk) {
    return NextResponse.json({ code: 'BAD_RESTAURANT', _src: 'orders-v1' }, { status: 400 });
  }

  // 4) Price & lines
  const reqItems: Array<{ itemId: string; qty: number; notes?: string; selections?: any }> = items;
  if (!reqItems.length) {
    return NextResponse.json({ code: 'BAD_REQUEST', reason: 'NO_ITEMS', _src: 'orders-v1' }, { status: 400 });
  }

  const ids = Array.from(new Set(reqItems.map(x => x.itemId)));
  const { data: dbItems, error: diErr } = await supabase
    .from('menu_items_v2')
    .select('id, restaurant_id, base_price_cents')
    .in('id', ids);
  if (diErr) {
    return NextResponse.json({ code: 'ITEM_LOOKUP_FAILED', details: diErr.message, _src: 'orders-v1' }, { status: 500 });
  }

  const priceById = new Map<string, number>();
  for (const row of dbItems ?? []) {
    if (row.restaurant_id !== rid) {
      return NextResponse.json({ code: 'ITEM_WRONG_TENANT', itemId: row.id, _src: 'orders-v1' }, { status: 400 });
    }
    priceById.set(row.id, row.base_price_cents ?? 0);
  }
  for (const it of reqItems) {
    if (!priceById.has(it.itemId)) {
      return NextResponse.json({ code: 'INVALID_ITEM_ID', itemId: it.itemId, _src: 'orders-v1' }, { status: 400 });
    }
  }

  const lines = reqItems.map(it => {
    const qty = Math.max(1, Number(it.qty) || 1);
    const price = priceById.get(it.itemId)!; // cents each
    return {
      item_id: it.itemId,
      qty,
      price_cents: price,
      notes: it.notes ?? null,
      selections: it.selections ?? {}, // jsonb NOT NULL default {}
      line_total: price * qty,
    };
  });
  const total_cents = lines.reduce((s, l) => s + l.line_total, 0);

  // 5) Insert order
  if (!s?.id) {
    return NextResponse.json({ code: 'INVALID_SESSION', details: 'session not found', _src: 'orders-v1' }, { status: 400 });
  }
  const orderInsert = {
    restaurant_id: rid,
    session_id: s.id,
    type,
    status: 'pending',
    order_code: genOrderCode(),
    total_cents,
    currency: 'SEK',
    customer_name: body.customer?.name ?? null,
    phone_e164:    body.customer?.phone ?? null,
    email:         body.customer?.email ?? null,
  };
  const { data: createdOrder, error: oErr } = await supabase
    .from('orders')
    .insert(orderInsert)
    .select('id, order_code, total_cents, created_at')
    .single();
  if (oErr) {
    return NextResponse.json({ code: 'ORDER_INSERT_FAILED', details: oErr.message, _src: 'orders-v1' }, { status: 500 });
  }

  // 6) Insert order items
  const orderItemsInsert = lines.map(l => ({
    order_id: createdOrder.id,
    item_id: l.item_id,
    qty: l.qty,
    price_cents: l.price_cents,
    notes: l.notes,
    selections: l.selections,
  }));
  const { error: oiErr } = await supabase.from('order_items').insert(orderItemsInsert);
  if (oiErr) {
    return NextResponse.json({ code: 'ORDER_ITEMS_INSERT_FAILED', details: oiErr.message, _src: 'orders-v1' }, { status: 500 });
  }

  // 7) Success
  return NextResponse.json({
    orderId: createdOrder.id,
    orderCode: createdOrder.order_code,
    totalCents: createdOrder.total_cents,
    currency: 'SEK',
    items: orderItemsInsert.map(x => ({ itemId: x.item_id, qty: x.qty, price_cents: x.price_cents })),
    createdAt: createdOrder.created_at,
    _src: 'orders-v1'
  });
}