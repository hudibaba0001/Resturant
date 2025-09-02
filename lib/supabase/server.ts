import { cookies, headers } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export function getServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
      global: { headers: { 'x-client-info': 'dashboard-menu' } },
    }
  );
}

export function getSupabaseServer() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,        // e.g. https://xxx.supabase.co
    process.env.SUPABASE_SERVICE_ROLE_KEY!,       // server-only secret
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return { supabase };
}
