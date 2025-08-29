import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { supabase, res } = getSupabaseForRoute(req);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500, headers: res.headers });
    }

    return NextResponse.json({
      success: true,
      ordersFound: data?.length || 0,
      timestamp: new Date().toISOString()
    }, { status: 200, headers: res.headers });

  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
