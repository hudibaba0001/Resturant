export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithBearer } from '@/app/api/_lib/supabase-bearer';

// input the widget sends
type OrderItemIn = { itemId: string; qty: number; notes?: string | null };
type OrderIn = {
  restaurantId: string;
  sessionId: string;
  type: 'pickup' | 'dine_in';
  items: OrderItemIn[];
};

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function genCode(len = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, I/1
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = getSupabaseWithBearer(req);
    const body = (await req.json()) as Partial<OrderIn>;

    // 1) Validate input
    if (!body?.restaurantId || !UUID.test(body.restaurantId)) {
      return NextResponse.json({ code: 'BAD_RESTAURANT' }, { status: 400 });
    }
    if (!body?.sessionId || !UUID.test(body.sessionId)) {
      return NextResponse.json({ code: 'BAD_SESSION' }, { status: 400 });
    }
    if (body?.type !== 'pickup' && body?.type !== 'dine_in') {
      return NextResponse.json({ code: 'BAD_TYPE' }, { status: 400 });
    }
    const items = Array.isArray(body?.items) ? body!.items : [];
    if (items.length === 0) {
      return NextResponse.json({ code: 'NO_ITEMS' }, { status: 400 });
    }

    // 2) Verify the widget session (authorizes anon under RLS)
    const { data: sess, error: sErr } = await supabase
      .from('widget_sessions')
      .select('id, restaurant_id')
      .eq('id', body.sessionId)
      .eq('restaurant_id', body.restaurantId)
      .maybeSingle();

    if (sErr) {
      return NextResponse.json({ code: 'SESSION_LOOKUP_ERROR', error: sErr.message }, { status: 500 });
    }
    if (!sess) {
      return NextResponse.json({ code: 'SESSION_INVALID' }, { status: 403 });
    }

    // 3) Load menu prices for itemIds
    const ids = Array.from(new Set(items.map(i => i.itemId).filter(Boolean)));
    const { data: menu, error: mErr } = await supabase
      .from('menu_items')
      .select('id, price_cents, currency')
      .in('id', ids);

    if (mErr) {
      return NextResponse.json({ code: 'MENU_LOOKUP_ERROR', error: mErr.message }, { status: 500 });
    }
    const priceMap = new Map(menu!.map(m => [m.id, m]));
    // Resolve lines; reject if any item missing or qty invalid
    const lines = items.map(i => {
      const mi = priceMap.get(i.itemId);
      if (!mi || !(Number.isInteger(i.qty) && i.qty > 0)) return null;
      return {
        item_id: i.itemId,
        qty: i.qty,
        price_cents: mi.price_cents,
        notes: i.notes ?? null,
      };
    });
    if (lines.some(l => l === null)) {
      return NextResponse.json({ code: 'BAD_LINE' }, { status: 400 });
    }

    // 4) Compute totals and generate codes
    const total_cents = lines.reduce((s, l: any) => s + l.price_cents * l.qty, 0);
    const currency = (menu && menu[0]?.currency) || 'SEK';
    const order_code = genCode(6);
    const pin = body.type === 'pickup' ? genPin() : null;

    // 5) Create order (RLS: orders_widget_insert)
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert([{
        restaurant_id: body.restaurantId,
        session_id: body.sessionId,
        type: body.type,
        status: 'pending',
        order_code,
        total_cents,
        currency,
        pin,
        pin_issued_at: pin ? new Date().toISOString() : null,
      }])
      .select('id, order_code, status, total_cents, currency, type, created_at')
      .single();

    if (oErr || !order) {
      const msg = oErr?.message?.toLowerCase?.() || '';
      if (msg.includes('rls') || msg.includes('permission')) {
        return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
      }
      return NextResponse.json({ code: 'ORDER_INSERT_ERROR', error: oErr?.message }, { status: 500 });
    }

    // 6) Insert order_items (RLS: order_items_widget_insert)
    const payload = (lines as any[]).map(l => ({ ...l, order_id: order.id }));
    const { error: liErr } = await supabase.from('order_items').insert(payload);
    if (liErr) {
      return NextResponse.json({ code: 'LINE_INSERT_ERROR', error: liErr.message }, { status: 500 });
    }

    // 7) Return created order summary (no items list needed for widget)
    return NextResponse.json({
      order: {
        id: order.id,
        order_code: order.order_code,
        status: order.status,
        total_cents: order.total_cents,
        currency: order.currency,
        type: order.type,
        created_at: order.created_at,
        pin,                // show to user if pickup
      }
    }, { status: 201 });

  } catch (e: any) {
    return NextResponse.json({ code: 'ROUTE_THROW', error: String(e?.message || e) }, { status: 500 });
  }
}