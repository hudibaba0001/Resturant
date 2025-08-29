// app/api/orders/[orderId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { supabase, res } = getSupabaseForRoute(req);
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: res.headers });
    }

    // Get order (simple query, no joins)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ 
        error: 'Order not found',
        details: orderError?.message 
      }, { status: 404, headers: res.headers });
    }

    // Get order items separately
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', params.orderId);

    if (itemsError) {
      // Still return the order even if items fail
      return NextResponse.json({
        order: {
          id: order.id,
          code: order.order_code || order.code || '',
          status: order.status,
          total_cents: order.total_cents || 0,
          currency: order.currency || 'SEK',
          created_at: order.created_at,
          items: []
        },
        warning: 'Could not fetch order items'
      }, { status: 200, headers: res.headers });
    }

    // Format response
    const items = (orderItems || []).map(item => ({
      id: item.id,
      qty: item.qty || 1,
      price_cents: item.price_cents || 0,
      notes: item.notes || null,
      menu_item: null // Skip menu items for now
    }));

    return NextResponse.json({
      order: {
        id: order.id,
        code: order.order_code || order.code || '',
        status: order.status,
        total_cents: order.total_cents || 0,
        currency: order.currency || 'SEK',
        created_at: order.created_at,
        items
      }
    }, { status: 200, headers: res.headers });

  } catch (e: any) {
    // Always return a proper error response
    return NextResponse.json({
      error: 'Internal server error',
      message: e?.message || 'Unknown error',
      type: e?.constructor?.name
    }, { status: 500 });
  }
}
