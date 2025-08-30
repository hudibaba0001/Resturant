import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CookieAuth = { access_token?: string };

function parseAccessToken(req: NextRequest): string | null {
  const c = Array.from(req.cookies.getAll()).find(x =>
    /^sb-[a-z0-9]{20}-auth-token$/i.test(x.name)
  );
  if (!c?.value) return null;
  const raw = c.value.startsWith('base64-') ? c.value.slice(7) : c.value;
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8');
    return (JSON.parse(json) as CookieAuth).access_token ?? null;
  } catch { return null; }
}

export function getSupabaseWithBearer(req: NextRequest) {
  const accessToken = parseAccessToken(req);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
    }
  );
  return { supabase, accessToken };
}
