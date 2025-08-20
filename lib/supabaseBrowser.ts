// lib/supabaseBrowser.ts
import 'client-only';
import { createBrowserClient } from '@supabase/ssr';

let client:
  | ReturnType<typeof createBrowserClient>
  | null = null;

export function getSupabaseBrowser() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Don't crash the tree; let UI handle this nicely
    throw new Error(
      'Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the dev server.'
    );
  }
  client = createBrowserClient(url, anon);
  return client;
}
