// lib/supabaseServer.ts
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function getSupabaseServer() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      cookies: {
        get: (n) => store.get(n)?.value,
        set: (n, v, o) => store.set({ name: n, value: v, ...o }),
        remove: (n, o) => store.set({ name: n, value: '', ...o, maxAge: 0 }),
      } 
    }
  );
}
