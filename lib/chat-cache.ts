import { createClient } from '@supabase/supabase-js';

export async function getCachedChat(restaurantId: string, cacheKey: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from('chat_response_cache')
    .select('reply,cards,expires_at')
    .eq('restaurant_id', restaurantId)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  return data || null;
}

export async function setCachedChat(
  restaurantId: string,
  cacheKey: string,
  reply: any,
  cards: any[],
  menuHash: string,
  ttlDays = Number(process.env.CHAT_CACHE_TTL_DAYS || 7),
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const expires = new Date(Date.now() + ttlDays * 864e5).toISOString();
  await supabase.from('chat_response_cache').upsert({
    restaurant_id: restaurantId,
    cache_key: cacheKey,
    reply,
    cards,
    menu_hash: menuHash,
    expires_at: expires,
  }, { onConflict: 'restaurant_id,cache_key' });
}
