import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/app/api/_lib/supabase';
import * as Sentry from '@sentry/nextjs';
import { log, logError, logPerformance } from '@/lib/log';

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
  const t0 = Date.now();
  const orderId = params.orderId;
  
  // Structured logging
  const rid = log('order_status_req', { orderId });

  try {
    if (!orderId || !isUuid(orderId)) {
      log('order_status_invalid_id', { orderId, rid });
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
      log('order_status_invalid_status', { orderId, status: nextStatus, rid });
      return NextResponse.json({ 
        code: 'INVALID_STATUS',
        error: 'Invalid status' 
      }, { status: 400 });
    }

    // Auth via cookies (no service role) -> RLS enforced in DB
    const supabase = getSupabaseServer();

    // 1) Fetch current status (RLS must allow SELECT for staff)
    const { data: current, error: selErr } = await supabase
      .from('orders')
      .select('id,status,restaurant_id')
      .eq('id', orderId)
      .single();

    if (selErr) {
      // If the user lacks RLS perms, hide details
      log('order_status_forbidden', { orderId, error: selErr.message, rid });
      Sentry.captureMessage('order-status-forbidden', 'warning');
      
      return NextResponse.json({ 
        code: 'FORBIDDEN',
        error: 'Not found' 
      }, { status: 404 });
    }

    const fromStatus = current.status as OrderStatus;
    const allowedNext = ALLOWED[fromStatus] || [];
    
    if (!allowedNext.includes(nextStatus)) {
      log('order_status_invalid_transition', { 
        orderId, 
        from: fromStatus, 
        to: nextStatus, 
        allowed: allowedNext,
        rid 
      });
      
      Sentry.captureMessage('order-status-invalid-transition', 'warning');
      
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
        // Conflict detected - another user changed the status
        log('order_status_conflict', { 
          orderId, 
          expected: fromStatus, 
          actual: check.status,
          attempted: nextStatus,
          rid 
        });
        
        Sentry.captureMessage('order-status-conflict', 'info');
        
        return NextResponse.json(
          { 
            code: 'CONFLICT_STATUS_CHANGED',
            error: 'Conflict: status changed concurrently', 
            current: check.status 
          },
          { status: 409 }
        );
      }
      
      log('order_status_update_failed', { orderId, error: updErr.message, rid });
      Sentry.captureMessage('order-status-update-failed', 'error');
      
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

    // Success metrics
    const ms = Date.now() - t0;
    logPerformance('order_status_success', ms, { 
      orderId, 
      from: fromStatus, 
      to: nextStatus,
      rid 
    });
    
    // Sentry breadcrumb for tracing
    Sentry.addBreadcrumb({
      category: 'order',
      message: 'status-change',
      level: 'info',
      data: { orderId, from: fromStatus, to: nextStatus, ms },
    });
    
    // Custom metric for Sentry Discover
    Sentry.captureMessage('order-status-change', 'info');

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (e) {
    const ms = Date.now() - t0;
    const error = e as Error;
    
    logError('order_status_exception', error, { 
      orderId, 
      duration_ms: ms,
      rid 
    });
    
    Sentry.captureException(error);
    
    return NextResponse.json({ 
      code: 'INTERNAL_ERROR',
      error: 'Unexpected error' 
    }, { status: 500 });
  }
}
