// app/api/orders/[orderId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const { supabase, res } = getSupabaseForRoute(req);
  
  try {
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: res.headers });
    }

    // Skip RPC and use direct queries
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        )
      `)
      .eq('id', params.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404, headers: res.headers });
    }

    // Format response
    const items = (order.order_items || []).map((item: any) => ({
      id: item.id,
      qty: item.qty,
      price_cents: item.price_cents,
      notes: item.notes || null,
      menu_item: item.menu_items ? {
        id: item.menu_items.id,
        name: item.menu_items.name,
        currency: item.menu_items.currency || order.currency || 'SEK'
      } : null
    }));

    return NextResponse.json({
      order: {
        id: order.id,
        code: order.order_code || order.code,
        status: order.status,
        total_cents: order.total_cents,
        currency: order.currency || 'SEK',
        created_at: order.created_at,
        items
      }
    }, { status: 200, headers: res.headers });

  } catch (e: any) {
    console.error('Order fetch error:', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to fetch order' },
      { status: 500, headers: res.headers }
    );
  }
}
