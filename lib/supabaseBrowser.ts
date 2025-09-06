// lib/supabaseBrowser.ts
import 'client-only';
import { createBrowserClient } from '@supabase/ssr';

// Cache the client globally to prevent multiple GoTrueClient instances
export const supabase = (globalThis as any).__sb ??
  ((globalThis as any).__sb = (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      // Don't crash the tree; let UI handle this nicely
      throw new Error(
        'Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the dev server.'
      );
    }
    return createBrowserClient(url, anon);
  })());

// Keep the old function for backward compatibility
export function getSupabaseBrowser() {
  return supabase;
}
