#!/usr/bin/env node
/**
 * Safe admin-only helper:
 * - Uses env vars (no hardcoded keys)
 * - Exits in production to avoid accidental use on live infra
 *
 * Usage:
 *   node scripts/simple-restaurant-lookup.js <restaurant_id>
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const restaurantId = process.argv[2];

if (!restaurantId) {
  console.error('Usage: node scripts/simple-restaurant-lookup.js <restaurant_id>');
  process.exit(2);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(2);
}
if (process.env.NODE_ENV === 'production') {
  console.error('This script is disabled in production.');
  process.exit(2);
}

async function main() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin
    .from('restaurants')
    .select('id, name, is_active, allowed_origins')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error) {
    console.error('Lookup error:', error.message);
    process.exit(1);
  }
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
