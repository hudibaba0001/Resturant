import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/app/api/_lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const supabase = getSupabaseServer();
  const orderId = params.orderId;

  // Select order + nested lines + minimal menu item fields
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, code, status, total_cents, currency, created_at, updated_at,
      order_items (
        id, qty, price_cents, notes,
        menu_items:menu_items ( id, name, currency )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !data) {
    // 404 if no access by RLS or not found
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Shape a lean response the UI can consume easily
  const items = (data.order_items || []).map((oi: any) => ({
    id: oi.id,
    qty: oi.qty,
    price_cents: oi.price_cents,
    notes: oi.notes || null,
    menu_item: oi.menu_items ? {
      id: oi.menu_items.id,
      name: oi.menu_items.name,
      currency: oi.menu_items.currency || data.currency || 'SEK',
    } : null,
  }));

  return NextResponse.json({
    order: {
      id: data.id,
      code: data.code,
      status: data.status,
      total_cents: data.total_cents,
      currency: data.currency,
      created_at: data.created_at,
      updated_at: data.updated_at,
      items,
    },
  });
}
