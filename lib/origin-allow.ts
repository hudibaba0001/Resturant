import { getSupabaseServer } from '@/lib/supabaseServer';

export async function isAllowedOrigin(restaurantId: string, origin: string) {
  if (!origin) return true; // allow server-to-server
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('restaurants')
    .select('allowed_origins')
    .eq('id', restaurantId)
    .maybeSingle();
  const allowed = data?.allowed_origins || [];
  if (allowed.length === 0) return true; // default open until configured
  return allowed.some((o: string) => o === origin);
}
