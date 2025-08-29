import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  console.log('🔍 [SIMPLE] Orders API called with orderId:', params.orderId);
  
  try {
    // Test 1: Environment variables
    console.log('🔍 [SIMPLE] Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    });

    // Test 2: Supabase client creation
    const { supabase, res } = getSupabaseForRoute(req);
    console.log('✅ [SIMPLE] Supabase client created');

    // Test 3: Basic query
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', params.orderId)
      .single();

    if (error) {
      console.log('❌ [SIMPLE] Query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: 'QUERY_ERROR'
      }, { status: 500, headers: res.headers });
    }

    console.log('✅ [SIMPLE] Query successful:', order);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status
      }
    }, { status: 200, headers: res.headers });

  } catch (e: any) {
    console.log('💥 [SIMPLE] Exception:', e?.message);
    return NextResponse.json({
      success: false,
      error: e?.message || 'Unknown error',
      code: 'EXCEPTION'
    }, { status: 500 });
  }
}
