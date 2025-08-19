import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { serverEnv } from '@/lib/env'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe signature' },
      { status: 400 }
    )
  }

  const supabaseAdmin = getSupabaseAdmin()
  const stripe = getStripe()

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body, 
      signature, 
      serverEnv.stripeWebhookSecret()
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const { orderId, restaurantId, sessionToken, type } = session.metadata

        // Update order status to paid
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            status: 'paid',
            stripe_session_id: session.id,
            paid_at: new Date().toISOString(),
          })
          .eq('id', orderId)

        if (updateError) {
          console.error('Failed to update order status:', updateError)
          return NextResponse.json(
            { error: 'Failed to update order' },
            { status: 500 }
          )
        }

        // Get order details for notification
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (order) {
          // Here you would typically send notifications to restaurant and customer
          console.log(`Order ${orderId} completed for restaurant ${restaurantId}`)
        }

        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as any
        const { orderId } = session.metadata

        if (orderId) {
          // Update order status to expired
          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
              status: 'expired',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)

          if (updateError) {
            console.error('Failed to update expired order:', updateError)
          }
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}