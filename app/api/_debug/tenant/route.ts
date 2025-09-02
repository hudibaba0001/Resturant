export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServerSupabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server secret
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return supabase;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rid = url.searchParams.get('restaurantId') ?? '';

  const headers = Object.fromEntries([
    'host','origin','referer','x-forwarded-host','x-forwarded-proto','x-vercel-id'
  ].map(h => [h, (globalThis as any).Headers ? req.headers.get(h) : null]));

  // Derive host + origins as your guard likely does
  const host = headers.host ?? '';
  const origin = headers.origin ?? '';
  const referer = headers.referer ?? '';

  const candidates = Array.from(new Set([
    origin,
    referer.replace(/\/$/, ''),
    host,                       // bare host
    origin.replace(/\/$/, ''),  // origin without trailing slash
    referer,                    // full referer
  ])).filter(Boolean);

  const supabase = getServerSupabase();

  // Try matching by allowed_origins @> ANY(candidates)
  let byOrigin = null;
  let rpcError = null;
  
  try {
    const { data, error } = await supabase.rpc('debug_match_restaurant_by_origins', {
      _rid: rid || null,
      _candidates: candidates
    });
    
    if (error) {
      rpcError = error.message;
    } else {
      byOrigin = data;
    }
  } catch (e) {
    // RPC function doesn't exist, fallback to inline SQL
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, slug, allowed_origins, is_active, is_verified')
      .or(candidates.map(c => `allowed_origins.cs.{${c}}`).join(','))
      .limit(5);
    
    if (error) {
      rpcError = error.message;
    } else {
      byOrigin = data;
    }
  }

  return NextResponse.json({
    headers,
    candidates,
    rid_query: rid || null,
    byOrigin: byOrigin ?? null,
    error: rpcError
  });
}
