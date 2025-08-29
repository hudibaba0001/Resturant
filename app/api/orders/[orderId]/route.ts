// app/api/orders/[orderId]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRoute } from '@/app/api/_lib/supabase-route';

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  console.log('🔍 [DEBUG] Orders API called with orderId:', params.orderId);
  console.log('🔍 [DEBUG] Environment check:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    anonKeyLength: process.env.SUPABASE_ANON_KEY?.length || 0
  });
  
  try {
    // Create Supabase client directly without the helper
    const res = NextResponse.next();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            res.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );
    
    console.log('✅ [DEBUG] Supabase client created successfully');

    const orderId = params.orderId;
    if (!UUID_RE.test(orderId)) {
      console.log('❌ [DEBUG] Invalid UUID format:', orderId);
      return NextResponse.json({ code: 'BAD_ID' }, { status: 400, headers: res.headers });
    }

    // Auth required (keeps auth.uid() non-null in RPC)
    console.log('🔍 [DEBUG] Checking authentication...');
    const { data: auth, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ [DEBUG] Auth error:', authError);
      return NextResponse.json({ code: 'AUTH_ERROR', error: authError.message }, { status: 500, headers: res.headers });
    }
    
    if (!auth?.user) {
      console.log('❌ [DEBUG] No authenticated user found');
      return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401, headers: res.headers });
    }
    
    console.log('✅ [DEBUG] User authenticated:', auth.user.id);

    // --- Path A: RPC fast-path
    console.log('🔍 [DEBUG] Attempting RPC call...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_order_with_items', {
      p_order_id: orderId,
    });

    console.log('🔍 [DEBUG] RPC result:', { 
      hasError: !!rpcError, 
      errorMessage: rpcError?.message,
      dataLength: rpcData?.length || 0 
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      const base = rpcData[0];
      const items = rpcData
        .filter((r: any) => r.order_item_id)
        .map((r: any) => ({
          id: r.order_item_id,
          qty: r.qty,
          price_cents: r.price_cents,
          notes: r.notes ?? null,
          menu_item: r.menu_item_id
            ? {
                id: r.menu_item_id,
                name: r.menu_item_name,
                currency: r.menu_item_currency ?? base.currency ?? 'SEK',
              }
            : null,
        }));

      return NextResponse.json(
        {
          order: {
            id: base.order_id,
            code: base.code,
            status: base.status,
            total_cents: base.total_cents,
            currency: base.currency,
            created_at: base.created_at,
            items,
          },
        },
        { status: 200, headers: res.headers }
      );
    }

    // RPC failed → map common cases
    if (rpcError) {
      const msg = rpcError.message?.toLowerCase() || '';
      const rpcMissing = msg.includes('does not exist') || msg.includes('get_order_with_items');
      console.log('🔍 [DEBUG] RPC error analysis:', { msg, rpcMissing });
      
      if (!rpcMissing) {
        if (msg.includes('insufficient') || msg.includes('forbidden')) {
          console.log('❌ [DEBUG] RPC: FORBIDDEN');
          return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403, headers: res.headers });
        }
        if (msg.includes('not found')) {
          console.log('❌ [DEBUG] RPC: NOT_FOUND');
          return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404, headers: res.headers });
        }
        console.log('❌ [DEBUG] RPC: INTERNAL ERROR');
        return NextResponse.json({ code: 'INTERNAL', error: rpcError.message }, { status: 500, headers: res.headers });
      }
      console.log('🔄 [DEBUG] RPC missing, falling back to direct queries...');
    }

    // --- Path B: RLS-safe fallback (lean selects)
    console.log('🔍 [DEBUG] Starting fallback path...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, code, order_code, status, total_cents, currency, created_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404, headers: res.headers });
    }

    const { data: orderItems, error: lineErr } = await supabase
      .from('order_items')
      .select('id, qty, price_cents, notes, item_id')
      .eq('order_id', orderId);

    if (lineErr) {
      return NextResponse.json(
        { code: 'DB_LINE_ERROR' },
        { status: 500, headers: res.headers }
      );
    }

    const menuItemIds = Array.from(
      new Set((orderItems || []).map((i) => i.item_id).filter(Boolean))
    );

    let menuItemsMap = new Map<string, { id: string; name: string; currency: string | null }>();
    if (menuItemIds.length > 0) {
      const { data: menuItems, error: menuErr } = await supabase
        .from('menu_items')
        .select('id, name, currency')
        .in('id', menuItemIds);

      if (menuErr) {
        return NextResponse.json(
          { code: 'DB_MENU_ERROR' },
          { status: 500, headers: res.headers }
        );
      }
      menuItemsMap = new Map(menuItems!.map((m) => [m.id, m]));
    }

    const items = (orderItems || []).map((item) => {
      const mi = item.item_id ? menuItemsMap.get(item.item_id) || null : null;
      return {
        id: item.id,
        qty: item.qty,
        price_cents: item.price_cents,
        notes: item.notes || null,
        menu_item: mi
          ? { id: mi.id, name: mi.name, currency: mi.currency || order.currency || 'SEK' }
          : null,
      };
    });

    return NextResponse.json(
      {
        order: {
          id: order.id,
          code: order.order_code || order.code,
          status: order.status,
          total_cents: order.total_cents,
          currency: order.currency || 'SEK',
          created_at: order.created_at,
          items,
        },
        code: 'RPC_NOT_FOUND_FALLBACK_USED',
      },
      { status: 200, headers: res.headers }
    );
  } catch (e: any) {
    console.log('💥 [DEBUG] Route threw exception:', e);
    console.log('💥 [DEBUG] Exception stack:', e?.stack);
    
    // Create a response object to ensure we always return headers
    const errorResponse = NextResponse.json(
      { code: 'ROUTE_THROW', error: e?.message || 'Unknown error' },
      { status: 500 }
    );
    
    return errorResponse;
  }
}
