import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`[supabase/service] Missing required env: ${name}`);
  }
  return value;
}

export function getSupabaseService(): SupabaseClient {
  // Prefer explicit SUPABASE_URL if provided; fallback to NEXT_PUBLIC_SUPABASE_URL
  const url = process.env.SUPABASE_URL || getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "dashboard-items-service" } },
  });
}


