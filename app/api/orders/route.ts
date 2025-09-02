export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithBearer } from '@/app/api/_lib/supabase-bearer';
import { resolveSession } from '@/app/api/_lib/resolveSession';
import { createClient } from '@supabase/supabase-js';

const UUID_RE=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

type RawItem={itemId?:string;id?:string;qty?:number;quantity?:number;notes?:string|null;variant?:any;modifiers?:string[]|null};

function candidatesFromHeaders(req: Request) {
  const h = (n: string) => req.headers.get(n) ?? '';
  const host    = h('x-forwarded-host') || h('host');
  const origin  = h('origin');
  const referer = h('referer');
  return Array.from(new Set(
    [origin, referer, host, origin?.replace(/\/$/, ''), referer?.replace(/\/$/, '')].filter(Boolean)
  ));
}

async function parseBodyOrQuery(req: Request) {
  // Try JSON first, but don't crash if stream is empty/consumed
  let body: any = null;
  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      const raw = await req.text();              // <- safer than req.json() here
      if (raw) body = JSON.parse(raw);
    }
  } catch {}
  if (body && typeof body === 'object') return body;

  // Fallback: accept query params for debugging/tools
  const url = new URL(req.url);
  const restaurantId = url.searchParams.get('restaurantId');
  const sessionToken = url.searchParams.get('sessionToken');
  const type = url.searchParams.get('type') ?? 'pickup';
  const itemsQP = url.searchParams.get('items'); // JSON-encoded array
  let items: any[] = [];
  try { if (itemsQP) items = JSON.parse(itemsQP); } catch {}
  if (restaurantId && sessionToken) {
    return { restaurantId, sessionToken, type, items };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const debugWhy = url.searchParams.get('why') === '1';

    const body = await parseBodyOrQuery(req);
  if (!body) {
    // show why when debugging
    return NextResponse.json(
      { code: 'BAD_REQUEST', reason: 'NO_BODY', ct: req.headers.get('content-type') || null },
      { status: 400 }
    );
  }

  const rid   = body.restaurantId as string;
  const tok   = body.sessionToken as string;
  const itemsRaw = Array.isArray(body.items) ? body.items : [];

  // ✅ your enum is ('pickup','delivery','dine_in')
  const orderType: 'pickup' | 'dine_in' | 'delivery' =
    body.type === 'dine_in' ? 'dine_in' : 
    body.type === 'delivery' ? 'delivery' : 'pickup';

  // Basic validation
  if(!UUID_RE.test(rid)) return NextResponse.json({code:'BAD_RESTAURANT'},{status:400});
  if(!tok) return NextResponse.json({code:'BAD_SESSION'},{status:400});
  if(!itemsRaw.length) return NextResponse.json({code:'NO_ITEMS'},{status:400});

  const cands = candidatesFromHeaders(req);

  // ⬇️ Inline, explicit client (service role):
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseKey) {
    // keep your standard error contract
    return NextResponse.json(
      { code: 'SERVER_MISCONFIG', missing: { supabaseUrl: !supabaseUrl, supabaseKey: !supabaseKey } },
      { status: 500 }
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: r } = await supabase
    .from('restaurants')
    .select('id, is_active, is_verified, allowed_origins')
    .eq('id', rid)
    .maybeSingle();

  const { data: s } = await supabase
    .from('widget_sessions')
    .select('session_token, restaurant_id, origin')
    .eq('session_token', tok)
    .maybeSingle();

  let i: { id: string; restaurant_id: string } | null = null;
  if (itemsRaw[0]?.itemId) {
    const res = await supabase
      .from('menu_items_v2')
      .select('id, restaurant_id')
      .eq('id', itemsRaw[0].itemId)
      .maybeSingle();
    i = res.data as any;
  }

  // Core, data-driven checks (don't hard-fail on header quirks)
  const checks = {
    restaurantOk:   !!r && r.id === rid,
    restaurantLive: !!r && (r.is_active ?? true) && (r.is_verified ?? false),
    sessionOk:      !!s && s.restaurant_id === rid,
    itemOk:         i ? i.restaurant_id === rid : true,
    originAllowed:  !!r && (r.allowed_origins ?? []).some((o: string) => cands.includes(o)),
    sessionOriginOk:!!s && s.origin ? cands.includes(s.origin) : true,
  };

  if (debugWhy && (!checks.restaurantOk || !checks.restaurantLive || !checks.sessionOk || !checks.itemOk)) {
    return NextResponse.json({ code: 'BAD_RESTAURANT', checks }, { status: 400 });
  }

  if (!checks.restaurantOk || !checks.restaurantLive || !checks.sessionOk || !checks.itemOk) {
    return NextResponse.json({ code: 'BAD_RESTAURANT' }, { status: 400 });
  }

  // Header checks become advisory (log-only)
  if (!checks.originAllowed || !checks.sessionOriginOk) {
    console.warn('Origin mismatch (continuing):', { candidates: cands, allowed: r?.allowed_origins, sessionOrigin: s?.origin });
  }

  // ===== PRICE & LINES =====
  // Build unique item list
  const reqItems: Array<{ itemId: string; qty: number; notes?: string; selections?: any }> =
    Array.isArray(itemsRaw) ? itemsRaw : [];
  if (!reqItems.length) {
    return NextResponse.json({ code: 'BAD_REQUEST', reason: 'NO_ITEMS' }, { status: 400 });
  }

  // Fetch prices from menu_items_v2
  const ids = Array.from(new Set(reqItems.map(x => x.itemId)));
  const { data: dbItems, error: diErr } = await supabase
    .from('menu_items_v2')
    .select('id, restaurant_id, base_price_cents')
    .in('id', ids);
  if (diErr) {
    return NextResponse.json({ code: 'ITEM_LOOKUP_FAILED', details: diErr.message }, { status: 500 });
  }
  // Map by id
  const priceById = new Map<string, number>();
  for (const row of dbItems ?? []) {
    if (row.restaurant_id !== rid) {
      return NextResponse.json({ code: 'ITEM_WRONG_TENANT', itemId: row.id }, { status: 400 });
    }
    priceById.set(row.id, row.base_price_cents ?? 0);
  }
  // Validate all requested ids exist
  for (const it of reqItems) {
    if (!priceById.has(it.itemId)) {
      return NextResponse.json({ code: 'INVALID_ITEM_ID', itemId: it.itemId }, { status: 400 });
    }
  }

  // Compute totals + line payloads
  const lines = reqItems.map(it => {
    const price = priceById.get(it.itemId)!; // cents
    const qty = Math.max(1, Number(it.qty) || 1);
    return {
      item_id: it.itemId,
      qty,
      price_cents: price,
      notes: it.notes ?? null,
      selections: it.selections ?? {}, // jsonb
      line_total: price * qty,
    };
  });
  const total_cents = lines.reduce((s, l) => s + l.line_total, 0);

  // ===== SESSION ID (uuid) =====
  const { data: sessionRow, error: sIdErr } = await supabase
    .from('widget_sessions')
    .select('id')
    .eq('session_token', tok)
    .maybeSingle();
  if (sIdErr || !sessionRow) {
    return NextResponse.json({ code: 'INVALID_SESSION', details: sIdErr?.message ?? 'not found' }, { status: 400 });
  }

  // ===== INSERT ORDER =====
  const order = {
    restaurant_id: rid,
    session_id: sessionRow.id,
    type: orderType,
    status: 'pending',
    order_code: genCode(),
    total_cents,
    currency: 'SEK',
    // optional customer fields if present in body:
    customer_name: (body.customer?.name ?? null) as any,
    phone_e164:   (body.customer?.phone ?? null) as any,
    email:        (body.customer?.email ?? null) as any,
  };

  const { data: createdOrder, error: oErr } = await supabase
    .from('orders')
    .insert(order)
    .select('id, order_code, total_cents, created_at')
    .single();

  if (oErr) {
    return NextResponse.json({ code: 'ORDER_INSERT_FAILED', details: oErr.message }, { status: 500 });
  }

  // ===== INSERT ORDER ITEMS =====
  const orderItems = lines.map(l => ({
    order_id: createdOrder.id,
    item_id: l.item_id,
    qty: l.qty,
    price_cents: l.price_cents,
    notes: l.notes,
    selections: l.selections,
  }));

  const { error: oiErr } = await supabase.from('order_items').insert(orderItems);
  if (oiErr) {
    return NextResponse.json({ code: 'ORDER_ITEMS_INSERT_FAILED', details: oiErr.message }, { status: 500 });
  }

  // ===== SUCCESS RESPONSE =====
  return NextResponse.json({
    orderId: createdOrder.id,
    orderCode: createdOrder.order_code,
    totalCents: createdOrder.total_cents,
    currency: 'SEK',
    items: orderItems.map(x => ({ itemId: x.item_id, qty: x.qty, price_cents: x.price_cents })),
    createdAt: createdOrder.created_at,
  });

  } catch(e:any){
    return NextResponse.json({code:'ROUTE_THROW', error:String(e?.message||e)},{status:500});
  }
}

function genCode(len=6){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<len;i++)s+=a[(Math.random()*a.length)|0];return s;}
function genPin(){return String((Math.random()*9000+1000)|0);}

// --- DEBUG: read-only GET to inspect header → restaurant matching ---
import { getServerSupabase } from '@/lib/supabase/server'; // must return a service-role client

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rid = url.searchParams.get('restaurantId') ?? '';

  const headerNames = [
    'host',
    'origin',
    'referer',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-vercel-id',
  ];
  const headers: Record<string, string | null> = {};
  for (const h of headerNames) headers[h] = req.headers.get(h);

  const host    = headers['x-forwarded-host'] ?? headers['host'] ?? '';
  const origin  = headers['origin']  ?? '';
  const referer = headers['referer'] ?? '';

  // Build the same candidate list tenant guards usually try
  const candidates = Array.from(new Set(
    [origin, referer, host, origin.replace(/\/$/, ''), referer.replace(/\/$/, '')]
      .filter(Boolean)
  ));

  const supabase = getServerSupabase(); // should use SERVICE ROLE on server
  const { data: r, error } = await supabase
    .from('restaurants')
    .select('id, slug, is_active, is_verified, allowed_origins')
    .eq('id', rid)
    .maybeSingle();

  const matches =
    r?.allowed_origins?.length
      ? candidates.map(c => ({ candidate: c, match: r.allowed_origins.includes(c) }))
      : [];

  return NextResponse.json({
    rid,
    headers,
    candidates,
    restaurant: r ?? null,
    matches,
    anyMatch: matches.some(m => m.match),
    error: error?.message ?? null,
  });
}