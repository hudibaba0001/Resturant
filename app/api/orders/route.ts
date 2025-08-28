import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

const Body = z.object({
  restaurantId: z.string().min(1),
  sessionToken: z.string().min(1),
  type: z.enum(['dine_in', 'pickup']),
  items: z.array(z.object({ itemId: z.string().min(1), qty: z.number().int().positive() })).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, sessionToken, type, items } = Body.parse(body);

    // Verify session token using the new hashed approach
    const sessionId = await verifySessionToken(restaurantId, sessionToken);
    if (!sessionId) {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let orderId = `dev_${Math.random().toString(36).slice(2)}`;
    if (url && key) {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      
      // Generate order code
      const orderCode = 'O' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Calculate total (simplified - you'd normally get prices from menu_items)
      const totalCents = items.reduce((sum, item) => sum + (item.qty * 1000), 0); // 1000 cents = 10 SEK per item
      
      const { data, error } = await sb
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          session_id: sessionId,
          status: type === 'pickup' ? 'pending' : 'open',
          type,
          order_code: orderCode,
          total_cents: totalCents,
          currency: 'SEK'
        })
        .select('id')
        .limit(1)
        .single();
        
      if (error) {
        console.error('ORDERS_INSERT_ERROR', error);
      } else if (data?.id) {
        orderId = String(data.id);
        
        // Insert order items
        for (const item of items) {
          await sb.from('order_items').insert({
            order_id: data.id,
            item_id: item.itemId,
            qty: item.qty,
            price_cents: 1000 // Simplified pricing
          });
        }
      }
    }

    const origin = new URL(req.url).origin;

    if (type === 'dine_in') {
      // Return a short pickup/dine-in code (what the widget expects)
      const orderCode = String(Math.floor(1000 + Math.random() * 9000));
      return NextResponse.json({ orderId, orderCode }, { status: 200 });
    }

    if (type === 'pickup') {
      // Use internal dev checkout
      const checkoutUrl = `${origin}/dev/checkout?orderId=${encodeURIComponent(orderId)}`;
      return NextResponse.json({ orderId, checkoutUrl }, { status: 200 });
    }

    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 });
  } catch (err: any) {
    const status = err?.name === 'ZodError' ? 400 : 500;
    console.error('Orders API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status });
  }
}