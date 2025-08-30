export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithBearer } from '@/app/api/_lib/supabase-bearer';

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

type RawItem = {
  itemId?: string; id?: string;
  qty?: number; quantity?: number;
  notes?: string | null;
  variant?: { groupId: string; optionId: string } | null;
  modifiers?: string[] | null;
};

export async function POST(req: NextRequest) {
  try {
    const { supabase } = getSupabaseWithBearer(req);
    const body = await req.json().catch(() => ({} as any));

    // ---- 1) Normalize fields
    const restaurantId: string =
      body.restaurantId || body.restaurant_id || '';
    const sessionInput: string =
      body.sessionId || body.session_id || body.sessionToken || body.session_token || '';
    const typeRaw: string = (body.type || 'pickup') + '';
    const itemsRaw: RawItem[] = Array.isArray(body.items) ? body.items : [];

    const normType = (s: string) =>
      s.toLowerCase().replace(/[\s-]/g, '_');
    const type = normType(typeRaw);
    const typeOk = ['pickup', 'dine_in', 'delivery'].includes(type);

    if (!UUID_RE.test(restaurantId)) {
      return NextResponse.json({ code: 'BAD_RESTAURANT' }, { status: 400 });
    }
    if (!sessionInput) {
      return NextResponse.json({ code: 'BAD_SESSION', why: 'missing sessionId/sessionToken' }, { status: 400 });
    }
    if (!typeOk) {
      return NextResponse.json({ code: 'BAD_TYPE', got: typeRaw }, { status: 400 });
    }
    if (!itemsRaw.length) {
      return NextResponse.json({ code: 'NO_ITEMS' }, { status: 400 });
    }

    // Map item aliases
    const items = itemsRaw.map((r) => {
      const itemId = r.itemId || r.id || '';
      const qty = Number.isInteger(r.qty) ? r.qty : Number(r.quantity) || 0;
      return { itemId, qty, notes: r.notes ?? null };
    });

    if (items.some(i => !UUID_RE.test(i.itemId) || (i.qty ?? 0) <= 0)) {
      return NextResponse.json({ code: 'BAD_LINE' }, { status: 400 });
    }

    // ---- 2) Resolve session: accept UUID or session_token
    let sessionRow: { id: string; restaurant_id: string } | null = null;
    if (UUID_RE.test(sessionInput)) {
      const { data, error } = await supabase
        .from('widget_sessions')
        .select('id, restaurant_id')
        .eq('id', sessionInput)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      if (error) return NextResponse.json({ code: 'SESSION_LOOKUP_ERROR', error: error.message }, { status: 500 });
      sessionRow = data;
    } else {
      const { data, error } = await supabase
        .from('widget_sessions')
        .select('id, restaurant_id')
        .eq('session_token', sessionInput)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      if (error) return NextResponse.json({ code: 'SESSION_LOOKUP_ERROR', error: error.message }, { status: 500 });
      sessionRow = data;
    }
    if (!sessionRow) {
      // Keep as 403 so we don't reveal anything about sessions
      return NextResponse.json({ code: 'SESSION_INVALID' }, { status: 403 });
    }

    // ---- 3) Load base prices for itemIds
    const ids = Array.from(new Set(items.map(i => i.itemId)));
    const { data: menu, error: mErr } = await supabase
      .from('menu_items')
      .select('id, price_cents, currency')
      .in('id', ids);
    if (mErr) return NextResponse.json({ code: 'MENU_LOOKUP_ERROR', error: mErr.message }, { status: 500 });

    const priceMap = new Map(menu!.map(m => [m.id, m]));
    // For MVP, we ignore variant/modifier deltas in price calc here (base price only)
    const lines = items.map(i => {
      const mi = priceMap.get(i.itemId);
      if (!mi) return null;
      return {
        order_id: '', // set later
        item_id: i.itemId,
        qty: i.qty,
        price_cents: mi.price_cents,
        notes: i.notes ?? null,
        selections: {} // future: persist variant/modifier choices
      };
    });
    if (lines.some(l => l === null)) {
      return NextResponse.json({ code: 'BAD_LINE', why: 'unknown item id' }, { status: 400 });
    }

    const currency = (menu && menu[0]?.currency) || 'SEK';
    const total_cents = (lines as any[]).reduce((s, l) => s + l.price_cents * l.qty, 0);

    // ---- 4) Create order
    const order_code = genCode(6);
    const pin = type === 'pickup' ? genPin() : null;

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert([{
        restaurant_id: restaurantId,
        session_id: sessionRow.id,
        type,
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

    // ---- 5) Insert lines
    const payload = (lines as any[]).map(l => ({ ...l, order_id: order.id }));
    const { error: liErr } = await supabase.from('order_items').insert(payload);
    if (liErr) {
      return NextResponse.json({ code: 'LINE_INSERT_ERROR', error: liErr.message }, { status: 500 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        order_code: order.order_code,
        status: order.status,
        total_cents: order.total_cents,
        currency: order.currency,
        type: order.type,
        created_at: order.created_at,
        pin,
      }
    }, { status: 201 });

  } catch (e: any) {
    return NextResponse.json({ code: 'ROUTE_THROW', error: String(e?.message || e) }, { status: 500 });
  }
}

function genCode(len = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}