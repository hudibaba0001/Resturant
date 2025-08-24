import { getSupabaseServer } from '@/lib/supabaseServer';

export async function emitEvent(restaurantId: string, type: string, props: Record<string, any>) {
  try {
    const supabase = getSupabaseServer();
    await supabase.from('widget_events').insert({
      restaurant_id: restaurantId,
      type,
      props,
      session_token: props.sessionToken || null,
    });
  } catch { /* swallow */ }
}
