export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'api-public-session' } },
  });
}

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

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Hash the session token for storage
    const session_token_hash = `\\x${Buffer.from(session_token, 'utf8').toString('hex')}`;

    // Upsert session (insert or update last_seen_at)
    const { data, error } = await supabase
      .from('widget_sessions')
      .upsert({
        restaurant_id,
        session_token_hash, // Store hashed token
        origin: origin || null,
        referer: referer || null,
        user_agent: user_agent || null,
        locale: locale || null,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'session_token_hash', // Use hashed token for conflict resolution
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
      session_token: session_token // Return original token to client
    });

  } catch (error) {
    console.error('Session endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
