import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { supabase, res } = getSupabaseForRoute(req);
    
    // Test authentication
    const { data: auth, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json({
        authenticated: false,
        error: authError.message,
        code: 'AUTH_ERROR'
      }, { status: 401, headers: res.headers });
    }
    
    if (!auth?.user) {
      return NextResponse.json({
        authenticated: false,
        error: 'No user found',
        code: 'UNAUTHENTICATED'
      }, { status: 401, headers: res.headers });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.user.id,
        email: auth.user.email
      },
      code: 'SUCCESS'
    }, { status: 200, headers: res.headers });

  } catch (e: any) {
    return NextResponse.json({
      authenticated: false,
      error: e?.message || 'Unknown error',
      code: 'EXCEPTION'
    }, { status: 500 });
  }
}
