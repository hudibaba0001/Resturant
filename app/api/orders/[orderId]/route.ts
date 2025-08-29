export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

const DEV = process.env.NODE_ENV !== 'production';
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  const { supabase, res } = getSupabaseForRoute(req);

  try {
    const orderId = params.orderId;
    if (!UUID_RE.test(orderId)) {
      return NextResponse.json({ code: 'BAD_ID' }, { status: 400, headers: res.headers });
    }

    // require an authenticated session so auth.uid() in RPC is never NULL
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401, headers: res.headers });
    }

    const { data, error } = await supabase.rpc('get_order_with_items', { p_order_id: orderId });

    if (error) {
      const msg = String((error as any)?.message || '');
      if (/does not exist/i.test(msg) || /get_order_with_items/i.test(msg)) {
        return NextResponse.json({ code: 'RPC_NOT_FOUND', debug: DEV ? msg : undefined }, { status: 500, headers: res.headers });
      }
      if (/insufficient|forbidden/i.test(msg)) {
        return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403, headers: res.headers });
      }
      if (/not found/i.test(msg)) {
        return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404, headers: res.headers });
      }
      return NextResponse.json({ code: 'INTERNAL', debug: DEV ? msg : undefined }, { status: 500, headers: res.headers });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404, headers: res.headers });
    }

    const base = data[0];
    const items = data
      .filter((r: any) => r.order_item_id)
      .map((r: any) => ({
        id: r.order_item_id,
        qty: r.qty,
        price_cents: r.price_cents,
        notes: r.notes ?? null,
        menu_item: r.menu_item_id
          ? { id: r.menu_item_id, name: r.menu_item_name, currency: r.menu_item_currency ?? base.currency ?? 'SEK' }
          : null,
      }));

    return NextResponse.json({
      order: {
        id: base.order_id,
        code: base.code,
        status: base.status,
        total_cents: base.total_cents,
        currency: base.currency,
        created_at: base.created_at,
        items,
      },
    }, { status: 200, headers: res.headers });
  } catch (e: any) {
    return NextResponse.json(
      { code: 'ROUTE_THROW', debug: DEV ? String(e?.message || e) : undefined },
      { status: 500, headers: res.headers }
    );
  }
}
