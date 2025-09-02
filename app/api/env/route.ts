export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

const NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  // common typo variants people sometimes set by mistake:
  'SUPABASE_SERVICE_ROLE',
  'SUPABASE_SERVICE_KEY',
  'SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_SERVICE_ROLE_KEY',
];

export async function GET() {
  const env = NAMES.map((n) => ({
    name: n,
    present: !!process.env[n],
    length: typeof process.env[n] === 'string' ? (process.env[n] as string).length : 0,
  }));
  return NextResponse.json({ env });
}
