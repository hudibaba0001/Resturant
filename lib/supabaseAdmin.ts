// lib/supabaseAdmin.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from './env';

export function getSupabaseAdmin() {
  return createClient(
    serverEnv.supabaseUrl(),
    serverEnv.supabaseServiceRole(),
    { 
      auth: { persistSession: false, autoRefreshToken: false }, 
      global: { headers: { 'X-Client-Info': 'stjarna-admin' } } 
    }
  );
}
