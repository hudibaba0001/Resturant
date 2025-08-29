import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithBearer } from '@/app/api/_lib/supabase-bearer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { supabase, accessToken } = getSupabaseWithBearer(req);
    
    if (!accessToken) {
      return NextResponse.json({
        authenticated: false,
        error: 'No access token found',
        code: 'UNAUTHENTICATED'
      }, { status: 401 });
    }

    // Test basic query
    const { data: orders, error: queryError } = await supabase
      .from('orders')
      .select('id, status')
      .limit(1);

    if (queryError) {
      return NextResponse.json({
        authenticated: false,
        error: queryError.message,
        code: 'QUERY_ERROR'
      }, { status: 500 });
    }

    return NextResponse.json({
      authenticated: true,
      ordersCount: orders?.length || 0,
      code: 'SUCCESS'
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({
      authenticated: false,
      error: e?.message || 'Unknown error',
      code: 'EXCEPTION'
    }, { status: 500 });
  }
}
