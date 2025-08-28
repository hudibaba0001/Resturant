import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/app/api/_lib/supabase';

export const dynamic = 'force-dynamic';

function isUuid(s: string) {
  return /^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[1-5][0-9a-fA-F-]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const supabase = getSupabaseServer();
  const orderId = params.orderId;

  if (!isUuid(orderId)) {
    return NextResponse.json({ code: 'BAD_ID' }, { status: 400 });
  }

  try {
    // 1) Fetch order (RLS ensures staff access)
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .select('id, code, status, total_cents, currency, created_at, restaurant_id')
      .eq('id', orderId)
      .single();

    if (oErr || !order) {
      // Hide details if RLS blocks
      return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    }

    // 2) Fetch order lines
    const { data: lines, error: lErr } = await supabase
      .from('order_items')
      .select('id, qty, price_cents, notes, item_id')
      .eq('order_id', orderId);

    if (lErr) {
      return NextResponse.json({ code: 'DB_LINE_ERROR' }, { status: 500 });
    }

    // 3) Fetch menu items (only the ones referenced)
    const itemIds = Array.from(
      new Set((lines || []).map((li) => li.item_id).filter(Boolean))
    );

    let itemsMap = new Map<string, { id: string; name: string; currency: string | null }>();
    if (itemIds.length > 0) {
      const { data: menu, error: mErr } = await supabase
        .from('menu_items')
        .select('id, name, currency')
        .in('id', itemIds);

      if (mErr) {
        return NextResponse.json({ code: 'DB_MENU_ERROR' }, { status: 500 });
      }
      itemsMap = new Map(menu!.map((m) => [m.id, m]));
    }

    const items = (lines || []).map((li) => {
      const mi = itemsMap.get(li.item_id) || null;
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
        code: order.code,
        status: order.status,
        total_cents: order.total_cents,
        currency: order.currency,
        created_at: order.created_at,
        items,
      },
    });
  } catch {
    return NextResponse.json({ code: 'INTERNAL' }, { status: 500 });
  }
}
