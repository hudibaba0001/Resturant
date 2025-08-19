// lib/env.ts
import 'server-only';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

/** Only call these from server code (API routes, actions, server components). */
export const serverEnv = {
  supabaseUrl: () => requireEnv('NEXT_PUBLIC_SUPABASE_URL'),   // URL is safe to be public but read lazily
  supabaseServiceRole: () => requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  openaiApiKey: () => requireEnv('OPENAI_API_KEY'),
  stripeSecretKey: () => requireEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: () => requireEnv('STRIPE_WEBHOOK_SECRET'),
  widgetOrigin: () => requireEnv('NEXT_PUBLIC_WIDGET_ORIGIN'), // public but still lazy
};