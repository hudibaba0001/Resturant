// Force Node runtime; no caching surprises
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

const DEV = process.env.NODE_ENV !== 'production';
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function normalizeOrder(o: any, items: any[]) {
  return {
    id: o.id,
    code: o.code ?? o.order_code ?? null,
    status: o.status,
    total_cents: o.total_cents,
    currency: o.currency ?? 'SEK',
    created_at: o.created_at,
    items,
  };
}

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  const { supabase, res } = getSupabaseForRoute(req);

  try {
    const orderId = params.orderId;
    if (!UUID_RE.test(orderId)) {
      return NextResponse.json({ code: 'BAD_ID' }, { status: 400, headers: res.headers });
    }

    // Require authenticated session so auth.uid() in RPC is never NULL
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401, headers: res.headers });
    }

    // --- Path A: try RPC first (fast, strict)
    const rpc = await supabase.rpc('get_order_with_items', { p_order_id: orderId });

    // If RPC succeeded, fold rows into UI shape
    if (!rpc.error && rpc.data && rpc.data.length > 0) {
      const base = rpc.data[0];
      const items = rpc.data
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

      return NextResponse.json({ order: normalizeOrder({
        id: base.order_id,
        code: base.code,
        status: base.status,
        total_cents: base.total_cents,
        currency: base.currency,
        created_at: base.created_at,
      }, items) }, { status: 200, headers: res.headers });
    }

    // If RPC error indicates "does not exist", fall through to Path B
    const rpcMsg = String(rpc.error?.message || '').toLowerCase();
    const rpcMissing = /does not exist/.test(rpcMsg) || /get_order_with_items/.test(rpcMsg);

    // --- Path B: RLS-safe direct reads (no nested select ambiguity)
    if (rpcMissing) {
      // 1) Fetch the order (RLS guards tenancy)
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .select('id, code, order_code, status, total_cents, currency, created_at')
        .eq('id', orderId)
        .single();

      if (oErr || !order) {
        return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404, headers: res.headers });
      }

      // 2) Fetch lines
      const { data: lines, error: lErr } = await supabase
        .from('order_items')
        .select('id, qty, price_cents, notes, item_id')
        .eq('order_id', orderId);

      if (lErr) {
        return NextResponse.json({ code: 'DB_LINE_ERROR', debug: DEV ? lErr.message : undefined }, { status: 500, headers: res.headers });
      }

      // 3) Fetch menu items referenced by lines
      const ids = Array.from(new Set((lines ?? []).map((li) => li.item_id).filter(Boolean)));
      let map = new Map<string, { id: string; name: string; currency: string | null }>();
      if (ids.length) {
        const { data: menu, error: mErr } = await supabase
          .from('menu_items')
          .select('id, name, currency')
          .in('id', ids);
        if (mErr) {
          return NextResponse.json({ code: 'DB_MENU_ERROR', debug: DEV ? mErr.message : undefined }, { status: 500, headers: res.headers });
        }
        map = new Map(menu!.map((m) => [m.id, m]));
      }

      const items = (lines ?? []).map((li) => {
        const mi = map.get(li.item_id) || null;
        return {
          id: li.id,
          qty: li.qty,
          price_cents: li.price_cents,
          notes: li.notes ?? null,
          menu_item: mi ? { id: mi.id, name: mi.name, currency: mi.currency ?? order.currency ?? 'SEK' } : null,
        };
      });

      return NextResponse.json(
        { order: normalizeOrder({ ...order, code: order.code ?? order.order_code }, items), code: 'RPC_NOT_FOUND_FALLBACK_USED' },
        { status: 200, headers: res.headers }
      );
    }

    // RPC failed for other reasons (auth/rls/unknown)
    if (/insufficient|forbidden/.test(rpcMsg)) {
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403, headers: res.headers });
    }
    if (/not found/.test(rpcMsg)) {
      return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404, headers: res.headers });
    }

    return NextResponse.json({ code: 'INTERNAL', debug: DEV ? rpc.error?.message : undefined }, { status: 500, headers: res.headers });
  } catch (e: any) {
    return NextResponse.json(
      { code: 'ROUTE_THROW', debug: DEV ? String(e?.message || e) : undefined },
      { status: 500, headers: res.headers }
    );
  }
}
