import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const orderId = String(form.get('orderId') ?? '');

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const pin_issued_at = new Date().toISOString();

    // Best-effort DB update; page still renders even if env not set
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key && orderId) {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      await sb.from('orders').update({ status: 'paid', pin, pin_issued_at }).eq('id', orderId);
    }

    return new Response(
      `<!doctype html><meta charset="utf-8" />
      <title>Payment successful</title>
      <body style="font-family:system-ui,sans-serif;max-width:520px;margin:3rem auto;">
        <h1>Payment successful ✅</h1>
        <p>Your pickup code is <strong style="font-size:1.25rem">${pin}</strong>.</p>
        <p>Show this code at the counter to collect your order.</p>
        <a href="/" style="display:inline-block;margin-top:12px;">Back to site</a>
      </body>`,
      { headers: { 'Content-Type': 'text/html' } },
    );
  } catch (e) {
    console.error('DEV_MARK_PAID_ERROR', e);
    return NextResponse.json({ error: 'mark_paid_failed' }, { status: 500 });
  }
}
