import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const orderSchema = z.object({
  restaurantId: z.string().uuid(),
  sessionToken: z.string(),
  type: z.enum(['pickup', 'delivery']),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    qty: z.number().positive(),
  })),
  customerInfo: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }).optional(),
  deliveryAddress: z.string().optional(),
})

type MenuItem = {
  id: string
  name: string
  price: number
  restaurant_id: string
  is_available: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, sessionToken, type, items, customerInfo, deliveryAddress } = orderSchema.parse(body)

    const supabaseAdmin = getSupabaseAdmin()
    const stripe = getStripe()

    // Get restaurant details
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .eq('is_active', true)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Get menu items and calculate total
    const itemIds = items.map(item => item.itemId)
    const { data: menuItems, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, price, restaurant_id, is_available')
      .eq('restaurant_id', restaurantId)
      .in('id', itemIds)
      .eq('is_available', true)

    if (menuError || !menuItems) {
      return NextResponse.json(
        { error: 'Menu items not found' },
        { status: 404 }
      )
    }

    const dbItems = menuItems as MenuItem[]

    // Calculate order total
    let total = 0
    const orderItems = items.map(orderItem => {
      const menuItem = dbItems.find(item => item.id === orderItem.itemId)
      if (!menuItem) {
        throw new Error(`Menu item ${orderItem.itemId} not found`)
      }
      const itemTotal = menuItem.price * orderItem.qty
      total += itemTotal
      return {
        ...orderItem,
        name: menuItem.name,
        price: menuItem.price,
        total: itemTotal,
      }
    })

    // Add delivery fee if applicable
    if (type === 'delivery') {
      total += 5.99 // Delivery fee
    }

    // Create order in database
    const orderId = uuidv4()
    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        restaurant_id: restaurantId,
        session_token: sessionToken,
        type,
        status: 'pending',
        total,
        customer_info: customerInfo || {},
        delivery_address: deliveryAddress,
        items: orderItems,
      })

    if (orderError) {
      console.error('Order creation error:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        ...orderItems.map(item => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.name,
            },
            unit_amount: Math.round(item.price * 100), // Convert to cents
          },
          quantity: item.qty,
        })),
        ...(type === 'delivery' ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Delivery Fee',
            },
            unit_amount: 599, // $5.99 in cents
          },
          quantity: 1,
        }] : []),
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/order/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        orderId,
        restaurantId,
        sessionToken,
        type,
      },
    })

    return NextResponse.json({
      orderId,
      checkoutUrl: session.url,
      total,
    })

  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}