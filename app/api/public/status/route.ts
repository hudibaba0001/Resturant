export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { corsHeaders } from '@/lib/cors';

const ALLOW = [
  'https://resturant.vercel.app',
  'https://*.your-customer.com', // optional wildcard if you must
];

function sb() {
  const url = env.supabaseUrl();
  const anon = env.supabaseAnon();
  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { 
    headers: corsHeaders(req.headers.get('origin') || '', ALLOW) 
  });
}

export async function GET(req: NextRequest) {
  try {
    // keep this strictly public (no PII)
    const supabase = sb();
    // example: only return static status or public config; do NOT expose cross-tenant data
    const headers = corsHeaders(req.headers.get('origin') || '', ALLOW);
    return NextResponse.json({ ok: true, ts: Date.now() }, { headers });
  } catch (error) {
    console.error('Status route error:', error);
    const headers = corsHeaders(req.headers.get('origin') || '', ALLOW);
    return NextResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500, headers });
  }
}
