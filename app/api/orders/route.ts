// Node runtime (Stripe, Supabase admin, heavy libs)
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { CORS_HEADERS } from '@/lib/cors'
import { v4 as uuidv4 } from 'uuid'

const orderSchema = z.object({
  restaurantId: z.string().uuid(),
  sessionToken: z.string(),
  type: z.enum(['pickup', 'dine_in']),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    qty: z.number().positive(),
  })),
})

type MenuItem = {
  id: string
  name: string
  price?: number
  price_cents?: number
  currency?: string
  restaurant_id: string
  is_available: boolean
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  })
}

export async function POST(request: NextRequest) {
  try {
    console.time("orders");
    const body = await request.json()
    const { restaurantId, sessionToken, type, items } = orderSchema.parse(body)

    // Quick env sanity
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    const supabaseAdmin = getSupabaseAdmin()

    // Get restaurant details
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .eq('is_active', true)
      .single()

    if (restaurantError || !restaurant) {
      console.error("Restaurant not found:", restaurantError);
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Get menu items and calculate total
    const itemIds = items.map(item => item.itemId)
    const { data: menuItems, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, price, price_cents, currency, restaurant_id, is_available')
      .eq('restaurant_id', restaurantId)
      .in('id', itemIds)
      .eq('is_available', true)

    if (menuError) { 
      console.error("menu_items select err", menuError); 
      throw menuError; 
    }
    if (!menuItems?.length) throw new Error("No items found");

    const dbItems = menuItems as MenuItem[]

    // Validate items belong to restaurant
    for (const it of dbItems) {
      if (it.restaurant_id !== restaurantId) throw new Error("Cross-restaurant item");
      if (!it.is_available) throw new Error(`Item unavailable: ${it.name}`);
    }

    // Calculate order total with backward compatibility
    let totalCents = 0
    const itemMap = new Map(dbItems.map(item => [item.id, item]))
    
    for (const orderItem of items) {
      const menuItem = itemMap.get(orderItem.itemId)
      if (!menuItem) {
        throw new Error(`Menu item ${orderItem.itemId} not found`)
      }
      
      // Use price_cents if available, otherwise fallback to price * 100
      const itemPriceCents = menuItem.price_cents ?? (menuItem.price ? Math.round(menuItem.price * 100) : 0)
      totalCents += itemPriceCents * orderItem.qty
    }

    const currency = dbItems[0]?.currency || 'SEK'

    // Upsert session
    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .upsert({ restaurant_id: restaurantId, session_token: sessionToken }, { onConflict: "restaurant_id,session_token" })
      .select("id")
      .single();

    // Create order
    const orderCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({ 
        restaurant_id: restaurantId, 
        session_id: session?.id || null, 
        type, 
        status: "pending",
        order_code: orderCode, 
        total_cents: totalCents, 
        currency 
      })
      .select("id, order_code")
      .single();
    
    if (orderErr) { 
      console.error("orders insert err", orderErr); 
      throw orderErr; 
    }

    // Insert order_items
    const { error: oiErr } = await supabaseAdmin.from("order_items").insert(
      items.map((i) => { 
        const menuItem = itemMap.get(i.itemId)!
        const itemPriceCents = menuItem.price_cents ?? (menuItem.price ? Math.round(menuItem.price * 100) : 0)
        return {
          order_id: order.id, 
          item_id: i.itemId, 
          qty: i.qty, 
          price_cents: itemPriceCents
        }
      })
    );
    
    if (oiErr) { 
      console.error("order_items insert err", oiErr); 
      throw oiErr; 
    }

    if (type === "pickup") {
      const stripe = getStripe();
      const origin = new URL(process.env.NEXT_PUBLIC_WIDGET_ORIGIN || 'http://localhost:3001').origin;
      
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
                  line_items: items.map(item => {
            const menuItem = itemMap.get(item.itemId)!
            const itemPriceCents = menuItem.price_cents ?? (menuItem.price ? Math.round(menuItem.price * 100) : 0)
            return {
              price_data: {
                currency: currency.toLowerCase(),
                product_data: {
                  name: menuItem.name,
                },
                unit_amount: itemPriceCents,
              },
              quantity: item.qty,
            }
          }),
        mode: 'payment',
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          order_id: order.id,
          restaurant_id: restaurantId,
          session_token: sessionToken,
        },
      });

      return NextResponse.json({ 
        checkoutUrl: checkoutSession.url 
      }, { headers: CORS_HEADERS });
    }

    // Dine-in response
    return NextResponse.json({ 
      orderCode: order.order_code 
    }, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error("orders route failed", error);
    return NextResponse.json(
      { error: error?.message || "Bad Request" },
      { status: 400, headers: CORS_HEADERS }
    )
  } finally {
    console.timeEnd("orders");
  }
}