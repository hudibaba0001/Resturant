import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CookieAuth = { 
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

// Security: validate environment variables
function validateEnvironment(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is required');
  }
  
  // Validate URL format
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  } catch {
    throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format');
  }
  
  // Validate key format (should be JWT-like)
  if (!process.env.SUPABASE_ANON_KEY.startsWith('eyJ')) {
    throw new Error('Invalid SUPABASE_ANON_KEY format');
  }
}

function extractAccessToken(req: NextRequest): string | null {
  try {
    // Security: validate request
    if (!req || !req.cookies) {
      return null;
    }

    // Cookie name: sb-<20charref>-auth-token
    const tokenCookie = Array.from(req.cookies.getAll())
      .find(c => /^sb-[a-z0-9]{20}-auth-token$/i.test(c.name));
    
    if (!tokenCookie?.value) {
      return null;
    }

    // Security: validate cookie value length
    if (tokenCookie.value.length > 10000) {
      console.warn('Suspiciously long auth cookie value');
      return null;
    }

    // Values are usually "base64-<jsonbase64>"
    const raw = tokenCookie.value.startsWith('base64-')
      ? tokenCookie.value.slice(7)
      : tokenCookie.value;

    // Security: validate base64 length
    if (raw.length < 10 || raw.length > 5000) {
      console.warn('Suspicious auth cookie length');
      return null;
    }

    const json = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as CookieAuth;
    
    // Security: validate token structure
    if (!parsed.access_token || typeof parsed.access_token !== 'string') {
      return null;
    }
    
    // Security: validate token format (JWT-like)
    if (!parsed.access_token.startsWith('eyJ') || parsed.access_token.length < 50) {
      console.warn('Invalid access token format');
      return null;
    }
    
    // Security: check if token is expired
    if (parsed.expires_at && Date.now() > parsed.expires_at * 1000) {
      console.log('Access token expired');
      return null;
    }

    return parsed.access_token;
  } catch (error) {
    // Security: don't leak parsing errors
    console.warn('Failed to extract access token:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Stateless Supabase client for API routes:
 * - No cookie writes, no refresh, no persistence.
 * - Every request uses Authorization: Bearer <access_token>.
 * - Secure token extraction and validation.
 */
export function getSupabaseWithBearer(req: NextRequest) {
  // Validate environment on first use
  try {
    validateEnvironment();
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid Supabase configuration');
  }

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
        headers: accessToken ? { 
          Authorization: `Bearer ${accessToken}`,
          'X-Client-Info': 'restaurant-widget-api'
        } : {},
      },
      // Security: disable potentially dangerous features
      db: {
        schema: 'public', // Only allow public schema access
      },
      // Security: reasonable timeouts
      realtime: {
        timeout: 20000,
        heartbeatIntervalMs: 30000,
      },
    }
  );

  return { supabase, accessToken };
}
