import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CookieAuth = { access_token?: string };

function extractAccessToken(req: NextRequest): string | null {
  // Cookie name: sb-<20charref>-auth-token
  const tokenCookie = Array.from(req.cookies.getAll())
    .find(c => /^sb-[a-z0-9]{20}-auth-token$/i.test(c.name));
  if (!tokenCookie?.value) return null;

  // Values are usually "base64-<jsonbase64>"
  const raw = tokenCookie.value.startsWith('base64-')
    ? tokenCookie.value.slice(7)
    : tokenCookie.value;

  try {
    const json = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as CookieAuth;
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Stateless Supabase client for API routes:
 * - No cookie writes, no refresh, no persistence.
 * - Every request uses Authorization: Bearer <access_token>.
 */
export function getSupabaseWithBearer(req: NextRequest) {
  const accessToken = extractAccessToken(req);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    }
  );

  return { supabase, accessToken };
}
