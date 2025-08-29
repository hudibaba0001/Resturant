// app/api/orders/[orderId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  // Step 1: Check environment variables
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  // Step 2: Try to import and create Supabase client
  try {
    const { createServerClient } = await import('@supabase/ssr');
    
    // Try with SUPABASE_ANON_KEY first (what your code uses)
    if (process.env.SUPABASE_ANON_KEY) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY,
        {
          cookies: {
            get: () => null,
            set: () => {},
            remove: () => {},
          },
        }
      );
      
      // Try a simple query
      const { error } = await supabase.from('orders').select('id').limit(1);
      
      return NextResponse.json({
        success: !error,
        envCheck,
        usedKey: 'SUPABASE_ANON_KEY',
        error: error?.message,
        orderId: params.orderId
      });
    }
    
    // Fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get: () => null,
            set: () => {},
            remove: () => {},
          },
        }
      );
      
      const { error } = await supabase.from('orders').select('id').limit(1);
      
      return NextResponse.json({
        success: !error,
        envCheck,
        usedKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        error: error?.message,
        orderId: params.orderId
      });
    }
    
    return NextResponse.json({
      success: false,
      envCheck,
      error: 'No anon key found'
    }, { status: 500 });
    
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      envCheck,
      error: e?.message || 'Unknown error',
      stack: e?.stack
    }, { status: 500 });
  }
}
