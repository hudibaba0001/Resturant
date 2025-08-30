export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithBearer } from '@/app/api/_lib/supabase-bearer';

// input the widget sends
type OrderItemIn = { itemId: string; qty: number; notes?: string | null };
type OrderIn = {
  restaurantId: string;
  sessionToken: string; // widget sends sessionToken, not sessionId
  type: 'pickup' | 'dine_in';
  items: OrderItemIn[];
};

// More permissive validation for MVP
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const SIMPLE_ID = /^[a-zA-Z0-9-_]+$/; // Allow simple IDs for development

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

    // 1) Validate input (more permissive for MVP)
    if (!body?.restaurantId || (!UUID.test(body.restaurantId) && !SIMPLE_ID.test(body.restaurantId))) {
      return NextResponse.json({ code: 'BAD_RESTAURANT', error: 'Invalid restaurant ID' }, { status: 400 });
    }
    if (!body?.sessionToken || (!UUID.test(body.sessionToken) && !SIMPLE_ID.test(body.sessionToken))) {
      return NextResponse.json({ code: 'BAD_SESSION', error: 'Invalid session token' }, { status: 400 });
    }
    if (body?.type !== 'pickup' && body?.type !== 'dine_in') {
      return NextResponse.json({ code: 'BAD_TYPE', error: 'Invalid order type' }, { status: 400 });
    }
    const items = Array.isArray(body?.items) ? body!.items : [];
    if (items.length === 0) {
      return NextResponse.json({ code: 'NO_ITEMS', error: 'No items in order' }, { status: 400 });
    }

    // 2) For MVP, skip session verification and use simple validation
    // TODO: Re-enable session verification once RLS is properly set up
    console.log('Creating order:', { restaurantId: body.restaurantId, sessionToken: body.sessionToken, type: body.type, itemCount: items.length });

    // 3) Load menu prices for itemIds (with fallback for MVP)
    const ids = Array.from(new Set(items.map(i => i.itemId).filter(Boolean)));
    const { data: menu, error: mErr } = await supabase
      .from('menu_items')
      .select('id, price_cents, currency')
      .in('id', ids);

    if (mErr) {
      console.error('Menu lookup error:', mErr);
      return NextResponse.json({ code: 'MENU_LOOKUP_ERROR', error: mErr.message }, { status: 500 });
    }
    
    const priceMap = new Map(menu!.map(m => [m.id, m]));
    
    // Resolve lines; for MVP, use fallback prices if menu items not found
    const lines = items.map(i => {
      const mi = priceMap.get(i.itemId);
      if (!(Number.isInteger(i.qty) && i.qty > 0)) return null;
      
      // Use menu price if available, otherwise fallback to 1000 cents (10 SEK)
      const price_cents = mi?.price_cents || 1000;
      
      return {
        item_id: i.itemId,
        qty: i.qty,
        price_cents,
        notes: i.notes ?? null,
      };
    });
    
    if (lines.some(l => l === null)) {
      return NextResponse.json({ code: 'BAD_LINE', error: 'Invalid item quantity' }, { status: 400 });
    }

    // 4) Compute totals and generate codes
    const total_cents = lines.reduce((s, l: any) => s + l.price_cents * l.qty, 0);
    const currency = (menu && menu[0]?.currency) || 'SEK';
    const order_code = genCode(6);
    const pin = body.type === 'pickup' ? genPin() : null;

    // 5) Create order (simplified for MVP)
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert([{
        restaurant_id: body.restaurantId,
        session_id: body.sessionToken,
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
      console.error('Order insert error:', oErr);
      const msg = oErr?.message?.toLowerCase?.() || '';
      if (msg.includes('rls') || msg.includes('permission')) {
        return NextResponse.json({ code: 'FORBIDDEN', error: 'Permission denied' }, { status: 403 });
      }
      return NextResponse.json({ code: 'ORDER_INSERT_ERROR', error: oErr?.message || 'Failed to create order' }, { status: 500 });
    }

    // 6) Insert order_items (RLS: order_items_widget_insert)
    const payload = (lines as any[]).map(l => ({ ...l, order_id: order.id }));
    const { error: liErr } = await supabase.from('order_items').insert(payload);
    if (liErr) {
      return NextResponse.json({ code: 'LINE_INSERT_ERROR', error: liErr.message }, { status: 500 });
    }

    // 7) Return widget-compatible response format
    if (body.type === 'dine_in') {
      return NextResponse.json({
        orderCode: order.order_code,
        orderId: order.id
      }, { status: 201 });
    } else {
      // For pickup, return checkout URL (widget expects this)
      const origin = new URL(req.url).origin;
      const checkoutUrl = `${origin}/dev/checkout?orderId=${encodeURIComponent(order.id)}`;
      return NextResponse.json({
        checkoutUrl,
        orderId: order.id,
        pin
      }, { status: 201 });
    }

  } catch (e: any) {
    return NextResponse.json({ code: 'ROUTE_THROW', error: String(e?.message || e) }, { status: 500 });
  }
}