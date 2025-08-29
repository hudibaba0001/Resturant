import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  console.log('🔍 [PUBLIC] Orders API called with orderId:', params.orderId);
  
  try {
    const { supabase, res } = getSupabaseForRoute(req);
    console.log('✅ [PUBLIC] Supabase client created');

    // Skip authentication for testing
    console.log('🔍 [PUBLIC] Skipping authentication for testing...');

    // Test basic query without RLS
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, total_cents')
      .eq('id', params.orderId)
      .single();

    if (error) {
      console.log('❌ [PUBLIC] Query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: 'QUERY_ERROR'
      }, { status: 500, headers: res.headers });
    }

    console.log('✅ [PUBLIC] Query successful:', order);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        total_cents: order.total_cents
      }
    }, { status: 200, headers: res.headers });

  } catch (e: any) {
    console.log('💥 [PUBLIC] Exception:', e?.message);
    return NextResponse.json({
      success: false,
      error: e?.message || 'Unknown error',
      code: 'EXCEPTION'
    }, { status: 500 });
  }
}
