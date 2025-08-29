import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('🔍 [CLIENT] Testing Supabase client creation');
  
  try {
    // Test 1: Environment variables
    console.log('🔍 [CLIENT] Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    });

    // Test 2: Create Supabase client directly
    const res = NextResponse.next();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    console.log('✅ [CLIENT] Supabase client created successfully');

    // Test 3: Basic query
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ [CLIENT] Query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: 'QUERY_ERROR'
      }, { status: 500, headers: res.headers });
    }

    console.log('✅ [CLIENT] Query successful, found orders:', data?.length || 0);

    return NextResponse.json({
      success: true,
      message: 'Supabase client working',
      ordersFound: data?.length || 0,
      timestamp: new Date().toISOString()
    }, { status: 200, headers: res.headers });

  } catch (e: any) {
    console.log('💥 [CLIENT] Exception:', e?.message);
    return NextResponse.json({
      success: false,
      error: e?.message || 'Unknown error',
      code: 'EXCEPTION'
    }, { status: 500 });
  }
}
