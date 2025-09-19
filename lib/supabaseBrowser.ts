// lib/supabaseBrowser.ts
import 'client-only';
import { createBrowserClient } from '@supabase/ssr';

function createClientSafe() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    const noop = async (..._args: any[]) => ({ data: null, error: null });
    return {
      auth: {
        signInWithPassword: async () => ({ data: { session: null }, error: new Error('SUPABASE_NOT_CONFIGURED') }),
        signOut: noop,
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
      },
    } as any;
  }
  return createBrowserClient(url, anon);
}

export const supabase = (globalThis as any).__sb ?? ((globalThis as any).__sb = createClientSafe());

// Keep the old function for backward compatibility
export function getSupabaseBrowser() {
  return supabase;
}
