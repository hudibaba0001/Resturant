// lib/supabaseAdmin.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export function getSupabaseAdmin() {
  return createClient(
    env.supabaseUrl(),
    env.supabaseServiceRole(),
    { 
      auth: { persistSession: false, autoRefreshToken: false }, 
      global: { headers: { 'X-Client-Info': 'stjarna-admin' } } 
    }
  );
}
