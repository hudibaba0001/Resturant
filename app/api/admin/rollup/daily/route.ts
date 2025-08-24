import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return new Response('Forbidden', { status: 403 });
  }
  const supabase = getSupabaseServer();
  // Example: count chats per restaurant yesterday
  const { data } = await supabase.rpc('rollup_chats_daily'); // create later as SQL function
  return new Response(JSON.stringify({ ok: true, data }), { headers: { 'Content-Type': 'application/json' } });
}
