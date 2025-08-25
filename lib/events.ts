import { createClient } from '@supabase/supabase-js';

export async function emitEvent(restaurantId: string, type: string, props: Record<string, any>) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from('widget_events').insert({
      restaurant_id: restaurantId,
      type,
      props,
      session_token: props.sessionToken || null,
    });
  } catch { /* swallow */ }
}
