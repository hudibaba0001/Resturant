import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    // Get order details
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, pin, total_cents, created_at')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only return PIN if order is paid
    if (order.status !== 'paid') {
      return NextResponse.json({
        id: order.id,
        status: order.status,
        total_cents: order.total_cents,
        created_at: order.created_at
      });
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      pin: order.pin,
      total_cents: order.total_cents,
      created_at: order.created_at
    });

  } catch (error) {
    console.error('Order details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
