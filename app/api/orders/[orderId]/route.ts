// app/api/orders/[orderId]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const { supabase, res } = getSupabaseForRoute(req);

  try {
    const orderId = params.orderId;
    if (!UUID_RE.test(orderId)) {
      return NextResponse.json({ code: 'BAD_ID' }, { status: 400, headers: res.headers });
    }

    // Auth required (keeps auth.uid() non-null in RPC)
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401, headers: res.headers });
    }

    // --- Path A: RPC fast-path
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_order_with_items', {
      p_order_id: orderId,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      const base = rpcData[0];
      const items = rpcData
        .filter((r: any) => r.order_item_id)
        .map((r: any) => ({
          id: r.order_item_id,
          qty: r.qty,
          price_cents: r.price_cents,
          notes: r.notes ?? null,
          menu_item: r.menu_item_id
            ? {
                id: r.menu_item_id,
                name: r.menu_item_name,
                currency: r.menu_item_currency ?? base.currency ?? 'SEK',
              }
            : null,
        }));

      return NextResponse.json(
        {
          order: {
            id: base.order_id,
            code: base.code,
            status: base.status,
            total_cents: base.total_cents,
            currency: base.currency,
            created_at: base.created_at,
            items,
          },
        },
        { status: 200, headers: res.headers }
      );
    }

    // RPC failed → map common cases
    if (rpcError) {
      const msg = rpcError.message?.toLowerCase() || '';
      const rpcMissing = msg.includes('does not exist') || msg.includes('get_order_with_items');
      if (!rpcMissing) {
        if (msg.includes('insufficient') || msg.includes('forbidden')) {
          return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403, headers: res.headers });
        }
        if (msg.includes('not found')) {
          return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404, headers: res.headers });
        }
        return NextResponse.json({ code: 'INTERNAL', error: rpcError.message }, { status: 500, headers: res.headers });
      }
      // fall through to fallback when RPC is missing
    }

    // --- Path B: RLS-safe fallback (lean selects)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, code, order_code, status, total_cents, currency, created_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404, headers: res.headers });
    }

    const { data: orderItems, error: lineErr } = await supabase
      .from('order_items')
      .select('id, qty, price_cents, notes, item_id')
      .eq('order_id', orderId);

    if (lineErr) {
      return NextResponse.json(
        { code: 'DB_LINE_ERROR' },
        { status: 500, headers: res.headers }
      );
    }

    const menuItemIds = Array.from(
      new Set((orderItems || []).map((i) => i.item_id).filter(Boolean))
    );

    let menuItemsMap = new Map<string, { id: string; name: string; currency: string | null }>();
    if (menuItemIds.length > 0) {
      const { data: menuItems, error: menuErr } = await supabase
        .from('menu_items')
        .select('id, name, currency')
        .in('id', menuItemIds);

      if (menuErr) {
        return NextResponse.json(
          { code: 'DB_MENU_ERROR' },
          { status: 500, headers: res.headers }
        );
      }
      menuItemsMap = new Map(menuItems!.map((m) => [m.id, m]));
    }

    const items = (orderItems || []).map((item) => {
      const mi = item.item_id ? menuItemsMap.get(item.item_id) || null : null;
      return {
        id: item.id,
        qty: item.qty,
        price_cents: item.price_cents,
        notes: item.notes || null,
        menu_item: mi
          ? { id: mi.id, name: mi.name, currency: mi.currency || order.currency || 'SEK' }
          : null,
      };
    });

    return NextResponse.json(
      {
        order: {
          id: order.id,
          code: order.order_code || order.code,
          status: order.status,
          total_cents: order.total_cents,
          currency: order.currency || 'SEK',
          created_at: order.created_at,
          items,
        },
        code: 'RPC_NOT_FOUND_FALLBACK_USED',
      },
      { status: 200, headers: res.headers }
    );
  } catch (e: any) {
    return NextResponse.json(
      { code: 'ROUTE_THROW', error: e?.message || 'Unknown error' },
      { status: 500, headers: res.headers }
    );
  }
}
