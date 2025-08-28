import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'expired';

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled', 'expired'],
  paid: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
  expired: [],
};

function isUuid(id: string) {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    if (!orderId || !isUuid(orderId)) {
      return NextResponse.json({ 
        code: 'INVALID_ORDER_ID',
        error: 'Invalid orderId' 
      }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const nextStatus = (body?.status as OrderStatus) || '';
    const allowedStatuses = new Set<OrderStatus>([
      'pending',
      'paid',
      'preparing',
      'ready',
      'completed',
      'cancelled',
      'expired',
    ]);
    if (!allowedStatuses.has(nextStatus)) {
      return NextResponse.json({ 
        code: 'INVALID_STATUS',
        error: 'Invalid status' 
      }, { status: 400 });
    }

    // Auth via cookies (no service role) -> RLS enforced in DB
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // 1) Fetch current status (RLS must allow SELECT for staff)
    const { data: current, error: selErr } = await supabase
      .from('orders')
      .select('id,status,restaurant_id')
      .eq('id', orderId)
      .single();

    if (selErr) {
      // If the user lacks RLS perms, hide details
      return NextResponse.json({ 
        code: 'FORBIDDEN',
        error: 'Not found' 
      }, { status: 404 });
    }

    const fromStatus = current.status as OrderStatus;
    const allowedNext = ALLOWED[fromStatus] || [];
    if (!allowedNext.includes(nextStatus)) {
      return NextResponse.json(
        {
          code: 'INVALID_TRANSITION',
          error: 'Invalid transition',
          from: fromStatus,
          allowed: allowedNext,
        },
        { status: 409 }
      );
    }

    // 2) Atomic conditional update to avoid race conditions
    const { data: updated, error: updErr } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId)
      .eq('status', fromStatus)           // <— only update if still in fromStatus
      .select('id,status,restaurant_id,updated_at')
      .single();

    if (updErr) {
      // Row may not match due to RLS or a concurrent change; return 409 if status changed
      // Try to detect if the row exists but status moved
      const { data: check } = await supabase.from('orders').select('status').eq('id', orderId).single();
      if (check && check.status !== fromStatus) {
        return NextResponse.json(
          { 
            code: 'CONFLICT_STATUS_CHANGED',
            error: 'Conflict: status changed concurrently', 
            current: check.status 
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ 
        code: 'FORBIDDEN',
        error: 'Update failed' 
      }, { status: 403 });
    }

    // 3) Fire-and-forget audit insert (RLS: editor+)
    const reason: string | undefined = (body?.reason as string | undefined)?.slice(0, 500) || undefined;
    await supabase.from('order_status_events').insert({
      order_id: orderId,
      restaurant_id: updated.restaurant_id,
      from_status: fromStatus,
      to_status: nextStatus,
      reason
    });

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ 
      code: 'INTERNAL_ERROR',
      error: 'Unexpected error' 
    }, { status: 500 });
  }
}
