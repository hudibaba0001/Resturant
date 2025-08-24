import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, session_token, origin, referer, user_agent, locale } = body;

    if (!restaurant_id || !session_token) {
      return NextResponse.json(
        { error: 'restaurant_id and session_token are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert session (insert or update last_seen_at)
    const { data, error } = await supabase
      .from('widget_sessions')
      .upsert({
        restaurant_id,
        session_token,
        origin: origin || null,
        referer: referer || null,
        user_agent: user_agent || null,
        locale: locale || null,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'session_token',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Session upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to create/update session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      session_id: data.id,
      session_token: data.session_token 
    });

  } catch (error) {
    console.error('Session endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
