// app/api/orders/[orderId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithBearer } from '@/app/api/_lib/supabase-bearer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { supabase, accessToken } = getSupabaseWithBearer(req);

    const orderId = params.orderId;
    if (!UUID_RE.test(orderId)) {
      return NextResponse.json({ code: 'BAD_ID' }, { status: 400 });
    }
    if (!accessToken) {
      return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    // --- Path A: RPC fast path
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_order_with_items', { p_order_id: orderId });

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
      }, { status: 200 });
    }

    // Map RPC errors
    if (rpcError) {
      const msg = rpcError.message?.toLowerCase() || '';
      const rpcMissing = msg.includes('does not exist') || msg.includes('get_order_with_items');
      if (!rpcMissing) {
        if (msg.includes('insufficient') || msg.includes('forbidden')) {
          return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
        }
        if (msg.includes('not found')) {
          return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
        }
        return NextResponse.json({ code: 'INTERNAL', error: rpcError.message }, { status: 500 });
      }
      // fall through to fallback when RPC is missing
    }

    // --- Path B: RLS-safe fallback (lean queries, correct columns + better errors)
    const { data: order, error: oErr } = await supabase
      .from('orders')
      // ⬅️ Remove non-existent "code" column
      .select('id, order_code, status, total_cents, currency, created_at')
      .eq('id', orderId)
      .maybeSingle(); // don't throw on 0 rows

    if (oErr) {
      const msg = (oErr as any)?.message?.toLowerCase?.() || '';
      // propagate meaningful statuses instead of 404
      if (msg.includes('permission denied') || msg.includes('rls')) {
        return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
      }
      if (msg.includes('jwt') || msg.includes('invalid') || msg.includes('expired')) {
        return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
      }
      // column not found / syntax / other server errors
      return NextResponse.json({ code: 'INTERNAL', error: (oErr as any)?.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    }

    // Items
    const { data: lines, error: lErr } = await supabase
      .from('order_items')
      .select('id, qty, price_cents, notes, item_id')
      .eq('order_id', orderId);

    if (lErr) {
      return NextResponse.json({ code: 'DB_LINE_ERROR', error: (lErr as any)?.message }, { status: 500 });
    }

    const ids = Array.from(new Set((lines || []).map(li => li.item_id).filter(Boolean)));
    let map = new Map<string, { id: string; name: string; currency: string | null }>();
    if (ids.length > 0) {
      const { data: menu, error: mErr } = await supabase
        .from('menu_items')
        .select('id, name, currency')
        .in('id', ids);
      if (mErr) {
        return NextResponse.json({ code: 'DB_MENU_ERROR', error: (mErr as any)?.message }, { status: 500 });
      }
      map = new Map(menu!.map(m => [m.id, m]));
    }

    const items = (lines || []).map(li => {
      const mi = li.item_id ? map.get(li.item_id) || null : null;
      return {
        id: li.id,
        qty: li.qty,
        price_cents: li.price_cents,
        notes: li.notes ?? null,
        menu_item: mi
          ? { id: mi.id, name: mi.name, currency: mi.currency ?? order.currency ?? 'SEK' }
          : null,
      };
    });

    return NextResponse.json({
      order: {
        id: order.id,
        code: order.order_code, // ⬅️ use the correct field
        status: order.status,
        total_cents: order.total_cents,
        currency: order.currency || 'SEK',
        created_at: order.created_at,
        items,
      },
      code: 'RPC_NOT_FOUND_FALLBACK_USED',
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json(
      { code: 'ROUTE_THROW', error: e?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
