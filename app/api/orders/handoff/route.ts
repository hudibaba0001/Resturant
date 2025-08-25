import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';



const HandoffRequestSchema = z.object({
  orderId: z.string().uuid(),
  pin: z.string().length(4).optional(),
  phoneLast4: z.string().length(4).optional(),
  amount: z.number().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate staff user
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookies().set(name, value, options);
          },
          remove(name: string, options: any) {
            cookies().set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const validation = HandoffRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validation.error.errors 
      }, { status: 400 });
    }

    const { orderId, pin, phoneLast4, amount } = validation.data;

    // 3. Get order and verify restaurant ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants!inner(
          id,
          name,
          staff:restaurant_staff!inner(user_id)
        )
      `)
      .eq('id', orderId)
      .eq('restaurants.staff.user_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found or access denied' }, { status: 404 });
    }

    // 4. Check if order is in a valid state for pickup
    if (order.status !== 'paid') {
      return NextResponse.json({ 
        error: `Order cannot be picked up. Current status: ${order.status}` 
      }, { status: 400 });
    }

    // 5. Validate PIN attempts (rate limiting)
    const { data: pinValidation } = await supabase
      .rpc('validate_pin_attempts', { order_id: orderId });

    if (!pinValidation) {
      return NextResponse.json({ 
        error: 'Too many PIN attempts. Please wait 10 minutes.' 
      }, { status: 429 });
    }

    // 6. Validate PIN or fallback to phone + amount
    let isValidHandoff = false;

    if (pin) {
      // Primary: PIN validation
      isValidHandoff = order.pin === pin;
    } else if (phoneLast4 && amount) {
      // Fallback: phone last 4 + amount validation
      const orderPhoneLast4 = order.phone_e164?.slice(-4);
      const orderAmount = order.total_cents;
      
      isValidHandoff = orderPhoneLast4 === phoneLast4 && orderAmount === amount;
    }

    if (!isValidHandoff) {
      // Increment PIN attempts
      await supabase
        .from('orders')
        .update({ 
          pin_attempts: (order.pin_attempts || 0) + 1 
        })
        .eq('id', orderId);

      return NextResponse.json({ 
        error: 'Invalid pickup credentials' 
      }, { status: 400 });
    }

    // 7. Mark order as picked up
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'picked_up',
        picked_up_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      return NextResponse.json({ error: 'Failed to mark order as picked up' }, { status: 500 });
    }

    // 8. Log the handoff event
    await supabase.from('widget_events').insert({
      restaurant_id: order.restaurant_id,
      type: 'order_picked_up',
      payload: {
        orderId,
        handoffMethod: pin ? 'pin' : 'phone_amount',
        staffUserId: user.id,
        staffEmail: user.email
      }
    });

    return NextResponse.json({ 
      success: true,
      order: {
        id: order.id,
        status: 'picked_up',
        items: order.items,
        total_cents: order.total_cents,
        customer_name: order.customer_name,
        picked_up_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Handoff endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
