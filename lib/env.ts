// lib/env.ts
import 'server-only';

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnon: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRole: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  // add more as needed
  openaiKey: () => required('OPENAI_API_KEY'),
  stripeSecretKey: () => required('STRIPE_SECRET_KEY'),
};