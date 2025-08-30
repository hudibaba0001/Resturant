import { SupabaseClient } from '@supabase/supabase-js';

export async function resolveSession(
  sb: SupabaseClient,
  restaurantId: string,
  sessionId?: string,
  sessionToken?: string
): Promise<{ sessionId: string } | { code: string }> {
  if (sessionId) return { sessionId };

  if (!sessionToken) return { code: 'BAD_SESSION' };

  const { data, error } = await sb
    .from('widget_sessions')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('session_token', sessionToken)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return { code: 'SESSION_INVALID' };
  return { sessionId: data.id };
}
