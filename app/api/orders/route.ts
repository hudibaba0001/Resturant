import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const Body = z.object({
  restaurantId: z.string().min(1),
  sessionToken: z.string().min(1),
  type: z.enum(['dine_in', 'pickup']),
  items: z.array(z.object({ itemId: z.string().min(1), qty: z.number().int().positive() })).min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, sessionToken, type, items } = Body.parse(body);

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Minimal order fields for now; adjust to your table shape
    let orderId = `dev_${Math.random().toString(36).slice(2)}`;
    if (url && key) {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await sb
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          session_token: sessionToken,
          status: type === 'pickup' ? 'pending' : 'open',
          type,
          // Store items in a compatible column if you have it, or remove this:
          items_json: items, // <- create JSONB column later or remove
        })
        .select('id')
        .limit(1)
        .single();
      if (error) {
        console.error('ORDERS_INSERT_ERROR', error);
      } else if (data?.id) {
        orderId = String(data.id);
      }
    }

    if (type === 'dine_in') {
      // Return a short pickup/dine-in code (what the widget expects)
      const orderCode = String(Math.floor(1000 + Math.random() * 9000));
      return NextResponse.json({ orderId, orderCode }, { status: 200 });
    }

    // Simplified pickup: send back a fake checkout url for now
    const checkoutUrl = `https://example.com/checkout?o=${encodeURIComponent(orderId)}`;
    return NextResponse.json({ orderId, checkoutUrl }, { status: 200 });
  } catch (err: any) {
    const status = err?.name === 'ZodError' ? 400 : 500;
    console.error('ORDERS_API_ERROR', err?.message);
    return NextResponse.json({ error: 'orders_failed' }, { status });
  }
}