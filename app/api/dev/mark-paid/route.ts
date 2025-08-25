import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyPickup } from '@/lib/notify';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Dev-only safety check
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });
  }

  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    // Generate 4-digit PIN
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    
    // Update order status and add PIN
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        pin,
        pin_issued_at: new Date().toISOString(),
        notification_status: { sms: 'pending', email: 'pending' }
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error || !order) {
      console.error('Failed to update order:', error);
      return NextResponse.json({ error: 'Order not found or update failed' }, { status: 404 });
    }

    // Get restaurant info for notification
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', order.restaurant_id)
      .single();

    // Send pickup notification (will skip if no SMS/email configured)
    await notifyPickup({
      phone: order.phone_e164,
      email: order.email,
      pin,
      orderId,
      restaurantName: restaurant?.name || 'Restaurant',
      orderTotal: order.total_cents
    });

    // Log the successful payment
    await supabase.from('widget_events').insert({
      restaurant_id: order.restaurant_id,
      type: 'order_paid',
      payload: {
        orderId,
        paymentMethod: 'dev_test',
        amount: order.total_cents,
        pin
      }
    });

    console.log(`[DEV] Order ${orderId} marked as paid with PIN ${pin}`);

    return NextResponse.json({ 
      success: true, 
      pin,
      order: {
        id: order.id,
        status: order.status,
        total_cents: order.total_cents,
        pin_issued_at: order.pin_issued_at
      }
    });

  } catch (error) {
    console.error('[DEV] Mark-paid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
