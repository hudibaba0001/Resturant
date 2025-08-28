import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/app/api/_lib/supabase';

const DEV = process.env.NODE_ENV !== 'production';
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const supabase = getSupabaseServer();
  const orderId = params.orderId;

  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ code: 'BAD_ID' }, { status: 400 });
  }

  // ✅ Require an authenticated staff session (prevents auth.uid() = null in RPC)
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
  }

  // Single RPC call
  const { data, error } = await supabase.rpc('get_order_with_items', { p_order_id: orderId });

  if (error) {
    const msg = String((error as any)?.message || '');
    if (/does not exist/i.test(msg) || /function .* get_order_with_items/i.test(msg)) {
      // Signature/schema mismatch
      return NextResponse.json({ code: 'RPC_NOT_FOUND', debug: DEV ? msg : undefined }, { status: 500 });
    }
    if (/forbidden/i.test(msg) || /insufficient/i.test(msg)) {
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }
    if (/not found/i.test(msg)) {
      return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    }
    // Surface exact error in dev to avoid blind 500s
    return NextResponse.json({ code: 'INTERNAL', debug: DEV ? msg : undefined }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
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
  });
}
