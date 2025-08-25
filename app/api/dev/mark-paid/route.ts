import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const Body = z.object({ orderId: z.string().min(1) });

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const { orderId } = Body.parse(await req.json());
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !key) {
      return NextResponse.json({ error: 'supabase_env_missing' }, { status: 500 });
    }
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const { error } = await sb
      .from('orders')
      .update({
        status: 'paid',
        pin,
        pin_issued_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error('mark_paid_error', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, pin });
  } catch (e: any) {
    const status = e?.name === 'ZodError' ? 400 : 500;
    return NextResponse.json({ error: 'bad_request' }, { status });
  }
}
