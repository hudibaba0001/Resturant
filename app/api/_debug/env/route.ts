export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  // common misnamings people add by mistake:
  'SUPABASE_SERVICE_ROLE',
  'SUPABASE_SERVICE_KEY',
  'SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_SERVICE_ROLE_KEY',
];

export async function GET() {
  const out = NAMES.map((n) => {
    const v = process.env[n];
    return {
      name: n,
      present: !!v,
      length: typeof v === 'string' ? v.length : 0,
      // NEVER return the value
    };
  });
  return NextResponse.json({ env: out });
}
