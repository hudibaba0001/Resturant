import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Initialize Supabase inside the handler
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const orderId = params.orderId;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    // Get order details (no longer includes plaintext PIN)
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, total_cents, created_at, pin_issued_at')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Return order details (PIN is now hashed and not accessible)
    return NextResponse.json({
      id: order.id,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
      pin_issued_at: order.pin_issued_at,
      has_pin: order.pin_issued_at !== null
    });

  } catch (error) {
    console.error('Order details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
