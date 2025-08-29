import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('🔍 [DEBUG] Debug endpoint called');
  
  try {
    const { supabase, res } = getSupabaseForRoute(req);
    console.log('✅ [DEBUG] Supabase client created');

    // Test auth
    console.log('🔍 [DEBUG] Testing auth...');
    const { data: auth, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ [DEBUG] Auth error:', authError);
      return NextResponse.json({ 
        code: 'AUTH_ERROR', 
        error: authError.message,
        timestamp: new Date().toISOString()
      }, { status: 500, headers: res.headers });
    }
    
    if (!auth?.user) {
      console.log('❌ [DEBUG] No user found');
      return NextResponse.json({ 
        code: 'UNAUTHENTICATED',
        timestamp: new Date().toISOString()
      }, { status: 401, headers: res.headers });
    }
    
    console.log('✅ [DEBUG] User found:', auth.user.id);

    // Test basic query
    console.log('🔍 [DEBUG] Testing basic query...');
    const { data: orders, error: queryError } = await supabase
      .from('orders')
      .select('id, status')
      .limit(1);

    if (queryError) {
      console.log('❌ [DEBUG] Query error:', queryError);
      return NextResponse.json({ 
        code: 'QUERY_ERROR', 
        error: queryError.message,
        timestamp: new Date().toISOString()
      }, { status: 500, headers: res.headers });
    }

    console.log('✅ [DEBUG] Query successful, found orders:', orders?.length || 0);

    return NextResponse.json({
      code: 'SUCCESS',
      user: auth.user.id,
      ordersCount: orders?.length || 0,
      timestamp: new Date().toISOString()
    }, { status: 200, headers: res.headers });

  } catch (e: any) {
    console.log('💥 [DEBUG] Debug endpoint exception:', e);
    return NextResponse.json({
      code: 'EXCEPTION',
      error: e?.message || 'Unknown error',
      stack: e?.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
