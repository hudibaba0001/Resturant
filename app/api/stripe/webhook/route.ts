import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { notifyPickup } from '@/lib/notify';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});



export async function POST(req: NextRequest) {
  // Initialize Supabase inside the handler
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
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

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  
  if (!orderId) {
    console.error('No orderId in payment intent metadata');
    return;
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

  // Send pickup notification
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
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      pin
    }
  });

  console.log(`Order ${orderId} marked as paid with PIN ${pin}`);
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  
  if (!orderId) {
    console.error('No orderId in payment intent metadata');
    return;
  }

  // Update order status to failed
  await supabase
    .from('orders')
    .update({
      status: 'payment_failed'
    })
    .eq('id', orderId);

  // Log the payment failure
  await supabase.from('widget_events').insert({
    restaurant_id: (await supabase.from('orders').select('restaurant_id').eq('id', orderId).single()).data?.restaurant_id,
    type: 'order_payment_failed',
    payload: {
      orderId,
      paymentIntentId: paymentIntent.id,
      failureReason: paymentIntent.last_payment_error?.message
    }
  });

  console.log(`Order ${orderId} payment failed`);
}