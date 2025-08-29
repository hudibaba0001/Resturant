// app/api/orders/[orderId]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithBearer } from '@/app/api/_lib/supabase-bearer';

// Strict UUID validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Rate limiting (simple in-memory for now)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    // Input validation
    const orderId = params.orderId?.trim();
    if (!orderId || !UUID_RE.test(orderId)) {
      return NextResponse.json({ 
        code: 'BAD_ID', 
        error: 'Invalid order ID format' 
      }, { status: 400 });
    }

    // Rate limiting
    const clientIP = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json({ 
        code: 'RATE_LIMITED', 
        error: 'Too many requests' 
      }, { status: 429 });
    }

    // Authentication check
    const { supabase, accessToken } = getSupabaseWithBearer(req);
    if (!accessToken) {
      return NextResponse.json({ 
        code: 'UNAUTHENTICATED',
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // --- Path A: RPC fast path (if available)
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_order_with_items', { p_order_id: orderId });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const base = rpcData[0];
        
        // Validate RPC response structure
        if (!base.order_id || !base.status) {
          console.warn('RPC returned invalid data structure:', base);
          throw new Error('Invalid RPC response structure');
        }

        const items = rpcData
          .filter((r: any) => r.order_item_id && r.qty && r.price_cents)
          .map((r: any) => ({
            id: r.order_item_id,
            qty: Math.max(1, parseInt(r.qty) || 1),
            price_cents: Math.max(0, parseInt(r.price_cents) || 0),
            notes: r.notes?.trim() || null,
            menu_item: r.menu_item_id && r.menu_item_name ? {
              id: r.menu_item_id,
              name: r.menu_item_name.trim(),
              currency: r.menu_item_currency?.trim() || base.currency || 'SEK',
            } : null,
          }));

        return NextResponse.json({
          order: {
            id: base.order_id,
            code: base.code || base.order_code || '',
            status: base.status,
            total_cents: Math.max(0, parseInt(base.total_cents) || 0),
            currency: base.currency || 'SEK',
            created_at: base.created_at,
            items,
          },
          code: 'RPC_SUCCESS',
        }, { status: 200 });
      }

      // Handle RPC errors with proper status codes
      if (rpcError) {
        const msg = rpcError.message?.toLowerCase() || '';
        if (msg.includes('does not exist') || msg.includes('get_order_with_items')) {
          // RPC function missing, fall through to fallback
          console.log('RPC function missing, using fallback');
        } else if (msg.includes('insufficient') || msg.includes('forbidden')) {
          return NextResponse.json({ 
            code: 'FORBIDDEN',
            error: 'Access denied' 
          }, { status: 403 });
        } else if (msg.includes('not found')) {
          return NextResponse.json({ 
            code: 'NOT_FOUND',
            error: 'Order not found' 
          }, { status: 404 });
        } else {
          return NextResponse.json({ 
            code: 'INTERNAL', 
            error: 'Database error' 
          }, { status: 500 });
        }
      }
    } catch (rpcException) {
      console.warn('RPC execution failed, using fallback:', rpcException);
      // Fall through to fallback
    }

    // --- Path B: RLS-safe fallback (secure, lean queries)
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .select('id, order_code, status, total_cents, currency, created_at, restaurant_id')
      .eq('id', orderId)
      .maybeSingle();

    if (oErr) {
      const msg = (oErr as any)?.message?.toLowerCase?.() || '';
      
      // Security: don't leak internal details
      if (msg.includes('permission denied') || msg.includes('rls')) {
        return NextResponse.json({ 
          code: 'FORBIDDEN',
          error: 'Access denied' 
        }, { status: 403 });
      }
      if (msg.includes('jwt') || msg.includes('invalid') || msg.includes('expired')) {
        return NextResponse.json({ 
          code: 'UNAUTHENTICATED',
          error: 'Authentication expired' 
        }, { status: 401 });
      }
      
      console.error('Order query error:', oErr);
      return NextResponse.json({ 
        code: 'INTERNAL', 
        error: 'Database error' 
      }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ 
        code: 'NOT_FOUND',
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Security: validate order belongs to user's restaurant (RLS should handle this)
    if (!order.restaurant_id) {
      console.error('Order missing restaurant_id:', order.id);
      return NextResponse.json({ 
        code: 'INTERNAL',
        error: 'Invalid order data' 
      }, { status: 500 });
    }

    // Fetch order items securely
    const { data: lines, error: lErr } = await supabase
      .from('order_items')
      .select('id, qty, price_cents, notes, item_id')
      .eq('order_id', orderId);

    if (lErr) {
      console.error('Order items query error:', lErr);
      return NextResponse.json({ 
        code: 'DB_LINE_ERROR',
        error: 'Failed to fetch order items' 
      }, { status: 500 });
    }

    // Fetch menu items efficiently (batch query)
    const menuItemIds = Array.from(
      new Set((lines || []).map(li => li.item_id).filter(Boolean))
    );

    let menuItemsMap = new Map<string, { id: string; name: string; currency: string | null }>();
    if (menuItemIds.length > 0) {
      const { data: menu, error: mErr } = await supabase
        .from('menu_items')
        .select('id, name, currency')
        .in('id', menuItemIds);

      if (mErr) {
        console.error('Menu items query error:', mErr);
        return NextResponse.json({ 
          code: 'DB_MENU_ERROR',
          error: 'Failed to fetch menu items' 
        }, { status: 500 });
      }
      
      menuItemsMap = new Map(menu!.map(m => [m.id, {
        id: m.id,
        name: m.name?.trim() || '',
        currency: m.currency?.trim() || null
      }]));
    }

    // Build secure response with data validation
    const items = (lines || []).map(li => {
      const mi = li.item_id ? menuItemsMap.get(li.item_id) || null : null;
      return {
        id: li.id,
        qty: Math.max(1, parseInt(li.qty) || 1),
        price_cents: Math.max(0, parseInt(li.price_cents) || 0),
        notes: li.notes?.trim() || null,
        menu_item: mi ? {
          id: mi.id,
          name: mi.name,
          currency: mi.currency || order.currency || 'SEK'
        } : null,
      };
    });

    return NextResponse.json({
      order: {
        id: order.id,
        code: order.order_code || '',
        status: order.status,
        total_cents: Math.max(0, parseInt(order.total_cents) || 0),
        currency: order.currency || 'SEK',
        created_at: order.created_at,
        items,
      },
      code: 'FALLBACK_SUCCESS',
    }, { status: 200 });

  } catch (e: any) {
    // Security: don't leak internal errors
    console.error('Orders route exception:', e);
    
    return NextResponse.json(
      { 
        code: 'INTERNAL_ERROR',
        error: 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}
