import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Just import Supabase to test if it works
    const { createServerClient } = await import('@supabase/ssr');
    
    return NextResponse.json({
      success: true,
      message: 'Supabase import working',
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
