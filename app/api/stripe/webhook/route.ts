import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handlePaymentSuccess(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await handlePaymentFailure(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  // Initialize Supabase inside the function
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const orderId = session.metadata?.orderId;
  
  if (!orderId) {
    console.error('No orderId in session metadata');
    return;
  }

  // Generate 4-digit PIN
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  
  // Hash the PIN for storage
  const pin_hash = `\\x${Buffer.from(pin, 'utf8').toString('hex')}`;
  
  // Update order status and add hashed PIN
  const { data: order, error } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      pin_hash, // Store hashed PIN
      pin_issued_at: new Date().toISOString(),
      notification_status: { sms: 'pending', email: 'pending' }
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (error) {
    console.error('Failed to update order:', error);
    return;
  }

  // Get restaurant info for notification
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('id', order.restaurant_id)
    .single();

  // Send pickup notification with plaintext PIN (for customer use)
  await notifyPickup({
    phone: order.phone_e164,
    email: order.email,
    pin, // Use plaintext PIN for notification
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
      sessionId: session.id,
      amount: session.amount_total,
      pinIssued: true
    }
  });

  console.log(`Order ${orderId} marked as paid with PIN ${pin}`);
}

async function handlePaymentFailure(session: Stripe.Checkout.Session) {
  // Initialize Supabase inside the function
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const orderId = session.metadata?.orderId;
  
  if (!orderId) {
    console.error('No orderId in session metadata');
    return;
  }

  // Update order status to expired
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'expired'
    })
    .eq('id', orderId);

  if (error) {
    console.error('Failed to update order status:', error);
    return;
  }

  // Log the payment failure
  await supabase.from('widget_events').insert({
    restaurant_id: session.metadata?.restaurantId,
    type: 'order_failed',
    payload: {
      orderId,
      sessionId: session.id,
      reason: 'payment_expired'
    }
  });

  console.log(`Order ${orderId} marked as expired`);
}

async function notifyPickup({
  phone,
  email,
  pin,
  orderId,
  restaurantName,
  orderTotal
}: {
  phone?: string;
  email?: string;
  pin: string;
  orderId: string;
  restaurantName: string;
  orderTotal: number;
}) {
  // Implement your notification logic here
  // This could be SMS via Twilio, email via Resend, etc.
  console.log(`Pickup notification for order ${orderId}: PIN ${pin}`);
  
  // Example SMS notification (if you have Twilio configured)
  // if (phone) {
  //   await sendSMS(phone, `Your order is ready! Pickup code: ${pin}`);
  // }
  
  // Example email notification (if you have Resend configured)
  // if (email) {
  //   await sendEmail(email, `Order Ready - Pickup Code: ${pin}`);
  // }
}