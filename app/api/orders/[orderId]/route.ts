import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/app/api/_lib/supabase';

export const dynamic = 'force-dynamic';

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
}

type OrderWithItemsRow = {
  order_id: string;
  code: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  order_item_id: string | null;
  qty: number | null;
  price_cents: number | null;
  notes: string | null;
  menu_item_id: string | null;
  menu_item_name: string | null;
  menu_item_currency: string | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const supabase = getSupabaseServer();
  const orderId = params.orderId;
  if (!isUuid(orderId)) return NextResponse.json({ code: 'BAD_ID' }, { status: 400 });

  // Run the RPC (single call)
  const { data, error } = await supabase.rpc('get_order_with_items', { p_order_id: orderId });

  if (error) {
    // Map common cases to helpful statuses
    const msg = (error as any)?.message || '';
    if (/not found/i.test(msg)) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (/forbidden/i.test(msg) || /insufficient/i.test(msg)) {
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('get_order_with_items RPC error:', error); // visible in Vercel logs
    return NextResponse.json({ code: 'INTERNAL' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // Order exists but zero rows would be odd; treat as not found for safety
    return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  }

  // Fold rows into the shape your UI expects
  const base = data[0] as OrderWithItemsRow;
  const items = (data as OrderWithItemsRow[])
    .filter((r) => r.order_item_id) // keep only actual lines
    .map((r) => ({
      id: r.order_item_id!,
      qty: r.qty!,
      price_cents: r.price_cents!,
      notes: r.notes,
      menu_item: r.menu_item_id
        ? {
            id: r.menu_item_id,
            name: r.menu_item_name!,
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
