export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithBearer } from '@/app/api/_lib/supabase-bearer';
import { resolveSession } from '@/app/api/_lib/resolveSession';
import { getSupabaseServer } from '@/lib/supabase/server';

const UUID_RE=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

type RawItem={itemId?:string;id?:string;qty?:number;quantity?:number;notes?:string|null;variant?:any;modifiers?:string[]|null};

export async function POST(req:NextRequest){
  try{
    // Parse body
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });

    const rid   = body.restaurantId || body.restaurant_id || '';
    const tok   = body.sessionToken || body.session_token || '';
    const itemsRaw = Array.isArray(body.items) ? body.items : [];

    // ✅ your enum is ('pickup','delivery','dine_in')
    const orderType: 'pickup' | 'dine_in' | 'delivery' =
      body.type === 'dine_in' ? 'dine_in' : 
      body.type === 'delivery' ? 'delivery' : 'pickup';

    // Basic validation
    if(!UUID_RE.test(rid)) return NextResponse.json({code:'BAD_RESTAURANT'},{status:400});
    if(!tok) return NextResponse.json({code:'BAD_SESSION'},{status:400});
    if(!itemsRaw.length) return NextResponse.json({code:'NO_ITEMS'},{status:400});

    // Normalize headers (advisory only)
    const h = (n: string) => req.headers.get(n) ?? '';
    const host    = h('x-forwarded-host') || h('host');
    const origin  = h('origin');
    const referer = h('referer');
    const candidates = Array.from(new Set(
      [origin, referer, host, origin.replace(/\/$/, ''), referer.replace(/\/$/, '')].filter(Boolean)
    ));

    // Debug path for ?why=1
    const url = new URL(req.url);
    const debugWhy = url.searchParams.get('why') === '1';

    // Use service role client for guard checks
    const { supabase } = await getSupabaseServer(); // SERVICE ROLE

    // Read restaurant/session/item from DB
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

    // Optional: validate first item belongs to the same restaurant
    let i: { id: string; restaurant_id: string } | null = null;
    if (itemsRaw[0]?.itemId) {
      const res = await supabase
        .from('menu_items_v2')
        .select('id, restaurant_id')
        .eq('id', itemsRaw[0].itemId)
        .maybeSingle();
      i = res.data as any;
    }

    // Core, data-driven checks
    const restaurantOk   = !!r && r.id === rid;
    const restaurantLive = !!r && (r.is_active ?? true) && (r.is_verified ?? false);
    const sessionOk      = !!s && s.restaurant_id === rid;
    const itemOk         = i ? i.restaurant_id === rid : true;

    if (!restaurantOk || !restaurantLive || !sessionOk || !itemOk) {
      return NextResponse.json({ code: 'BAD_RESTAURANT' }, { status: 400 });
    }

    // Header checks become advisory (log-only)
    const originAllowed   = !!r && (r.allowed_origins ?? []).some((o: string) => candidates.includes(o));
    const sessionOriginOk = !!s && s.origin ? candidates.includes(s.origin) : true;
    if (!originAllowed || !sessionOriginOk) {
      console.warn('Origin mismatch (continuing):', { candidates, allowed: r?.allowed_origins, sessionOrigin: s?.origin });
    }

    // Debug path: return detailed checks if ?why=1
    if (debugWhy) {
      const checks = {
        restaurantOk,
        restaurantLive,
        sessionOk,
        itemOk,
        originAllowed,
        sessionOriginOk
      };
      
      return NextResponse.json({
        code: 'GUARD_PASSED',
        headers: { host, origin, referer },
        candidates,
        checks,
        restaurant: r ?? null,
        session: s ?? null,
        item: i ?? null,
      });
    }

    const items = itemsRaw.map((r: RawItem) => {
      const itemId = r.itemId || r.id || '';
      const qty = Number.isInteger(r.qty)? r.qty : Number(r.quantity)||0;
      return {itemId, qty, notes: r.notes ?? null};
    });
    if(items.some((i: any) => !i.itemId||(i.qty??0)<=0)) return NextResponse.json({code:'BAD_LINE'},{status:400});

    // ✅ Optional: Server-side valve for legacy numeric IDs (temporary)
    const numericIds = items.filter((i: any) => /^\d+$/.test(i.itemId)).map((i: any) => i.itemId);
    if (numericIds.length) {
      const { data: rows, error } = await supabase
        .from('menu_items')
        .select('id, nutritional_info')
        .eq('restaurant_id', rid);
      if (!error && rows) {
        const numMap = new Map<string,string>();
        for (const r of rows) {
          const n = r.nutritional_info?.item_number;
          if (n && /^\d+$/.test(String(n))) numMap.set(String(n), r.id);
        }
        items.forEach((i: any) => {
          if (/^\d+$/.test(i.itemId) && numMap.get(i.itemId)) {
            i.itemId = numMap.get(i.itemId)!;
          }
        });
      }
    }

    // ✅ Enforce UUID format for item IDs
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const l of items) {
      if (!UUID.test(l.itemId)) {
        return NextResponse.json({ code: 'BAD_LINE_ID_FORMAT', itemId: l.itemId }, { status: 400 });
      }
    }

    // Resolve session using the helper
    let session = await resolveSession(supabase, rid, undefined, tok);
    if ('code' in session) {
      // Auto-mint safety net for legacy widget-* tokens
      if (session.code === 'SESSION_INVALID' && tok && tok.startsWith('widget-')) {
        // soft-mint a new session for active restaurants
        const { data: r } = await supabase.from('restaurants').select('id, is_active').eq('id', rid).maybeSingle();
        if (r?.is_active) {
          const { data: sess, error: sErr } = await supabase
            .from('widget_sessions')
            .insert({ restaurant_id: rid, session_token: tok, locale: 'sv-SE' })
            .select('id').single();
          if (!sErr && sess) {
            // retry resolve
            const again = await resolveSession(supabase, rid, undefined, tok);
            if (!('code' in again)) {
              // continue with again.sessionId
              session = again;
            } else {
              return NextResponse.json({ code: again.code }, { status: 401 });
            }
          } else {
            return NextResponse.json({ code: session.code }, { status: 401 });
          }
        } else {
          return NextResponse.json({ code: session.code }, { status: 401 });
        }
      } else {
        return NextResponse.json({ code: session.code }, { status: 401 });
      }
    }

    // Price lookup
    const ids = Array.from(new Set(items.map((i: any) => i.itemId)));
    const { data: menu, error: mErr } = await supabase.from('menu_items').select('id, price_cents, currency').in('id', ids);
    if(mErr) return NextResponse.json({code:'MENU_LOOKUP_ERROR', error:mErr.message},{status:500});
    const map = new Map(menu!.map((m: any) => [m.id,m]));
    const lines = items.map((i: any) => {
      const mi = map.get(i.itemId);
      if(!mi) return null;
      return { order_id:'', item_id:i.itemId, qty:i.qty, price_cents: mi.price_cents, notes:i.notes, selections:{} };
    });
    if(lines.some((l: any) => l===null)) return NextResponse.json({code:'BAD_LINE', why:'unknown item or unavailable'},{status:400});

    const currency = menu?.[0]?.currency || 'SEK';
    const total_cents = (lines as any[]).reduce((s: any, l: any) => s + l.price_cents*l.qty, 0);
    const order_code = genCode(); const pin = orderType==='pickup'? genPin(): null;

    const { data: order, error: oErr } = await supabase.from('orders').insert([{
      restaurant_id: rid, session_id: session.sessionId, type: orderType, status:'pending',
      order_code, total_cents, currency, pin, pin_issued_at: pin? new Date().toISOString(): null
    }]).select('id, order_code, status, total_cents, currency, type, created_at').single();
    if(oErr || !order){
      const msg=oErr?.message?.toLowerCase?.()||'';
      if(msg.includes('rls')||msg.includes('permission')) return NextResponse.json({code:'FORBIDDEN'},{status:403});
      return NextResponse.json({code:'ORDER_INSERT_ERROR', error:oErr?.message},{status:500});
    }

    const payload=(lines as any[]).map(l=>({...l, order_id: order.id}));
    const { error: liErr } = await supabase.from('order_items').insert(payload);
    if(liErr) return NextResponse.json({code:'LINE_INSERT_ERROR', error: liErr.message},{status:500});

    return NextResponse.json({ order: {
      id: order.id, order_code: order.order_code, status: order.status, total_cents: order.total_cents,
      currency: order.currency, type: order.type, created_at: order.created_at, pin
    } }, {status:201});

  }catch(e:any){
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