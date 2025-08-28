import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

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
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
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
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Auth via cookies (no service role) -> RLS enforced in DB
    const supabase = createRouteHandlerClient({ cookies });

    // 1) Fetch current status (RLS must allow SELECT for staff)
    const { data: current, error: selErr } = await supabase
      .from('orders')
      .select('id,status,restaurant_id')
      .eq('id', orderId)
      .single();

    if (selErr) {
      // If the user lacks RLS perms, hide details
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const fromStatus = current.status as OrderStatus;
    const allowedNext = ALLOWED[fromStatus] || [];
    if (!allowedNext.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: 'Invalid transition',
          from: fromStatus,
          allowed: allowedNext,
        },
        { status: 409 }
      );
    }

    // 2) Update status (RLS ensures only staff editor+ can update)
    const { data: updated, error: updErr } = await supabase
      .from('orders')
      .update({ status: nextStatus }) // keep it narrow—only status
      .eq('id', orderId)
      .select('id,status,restaurant_id,updated_at')
      .single();

    if (updErr) {
      // RLS or other DB errors
      return NextResponse.json({ error: 'Update failed' }, { status: 403 });
    }

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
