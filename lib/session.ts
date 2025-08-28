import { createClient } from '@supabase/supabase-js';

/**
 * Verify a session token for a restaurant using the new hashed approach
 */
export async function verifySessionToken(restaurantId: string, sessionToken: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Use the new RPC function for secure token verification
    const { data: sessionId, error } = await supabase.rpc('verify_session_token', {
      p_restaurant_id: restaurantId,
      p_token: sessionToken
    });

    if (error) {
      console.error('Session verification error:', error);
      return null;
    }

    return sessionId;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

/**
 * Create or update a widget session with hashed token
 */
export async function createOrUpdateSession(sessionData: {
  restaurant_id: string;
  session_token: string;
  origin?: string;
  referer?: string;
  user_agent?: string;
  locale?: string;
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Hash the session token for storage
    const session_token_hash = `\\x${Buffer.from(sessionData.session_token, 'utf8').toString('hex')}`;

    const { data, error } = await supabase
      .from('widget_sessions')
      .upsert({
        restaurant_id: sessionData.restaurant_id,
        session_token_hash,
        origin: sessionData.origin || null,
        referer: sessionData.referer || null,
        user_agent: sessionData.user_agent || null,
        locale: sessionData.locale || null,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'session_token_hash',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Session creation error:', error);
      return null;
    }

    return {
      session_id: data.id,
      session_token: sessionData.session_token // Return original token
    };
  } catch (error) {
    console.error('Session creation failed:', error);
    return null;
  }
}
