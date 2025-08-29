import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const envCheck = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    anonKeyLength: process.env.SUPABASE_ANON_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  console.log('🔍 [DEBUG] Environment check:', envCheck);

  return NextResponse.json({
    code: 'ENV_CHECK',
    ...envCheck
  });
}
