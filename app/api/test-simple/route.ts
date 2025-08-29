import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('🔍 [SIMPLE] Test endpoint called');
  
  try {
    // Test environment variables
    const envCheck = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKeyLength: process.env.SUPABASE_ANON_KEY?.length || 0
    };

    console.log('🔍 [SIMPLE] Environment check:', envCheck);

    return NextResponse.json({
      success: true,
      message: 'Simple endpoint working',
      env: envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (e: any) {
    console.log('💥 [SIMPLE] Exception:', e?.message);
    return NextResponse.json({
      success: false,
      error: e?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
