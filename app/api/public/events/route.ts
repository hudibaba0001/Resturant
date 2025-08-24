import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, session_id, type, payload } = body;

    if (!restaurant_id || !session_id || !type) {
      return NextResponse.json(
        { error: 'restaurant_id, session_id, and type are required' },
        { status: 400 }
      );
    }

    // Validate event type
    const validTypes = ['open', 'add_to_cart', 'chat_send', 'chat_reply', 'checkout_start', 'order_created', 'error'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert event
    const { data, error } = await supabase
      .from('widget_events')
      .insert({
        restaurant_id,
        session_id,
        type,
        payload: payload || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Event insert error:', error);
      return NextResponse.json(
        { error: 'Failed to log event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      event_id: data.id 
    });

  } catch (error) {
    console.error('Events endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
