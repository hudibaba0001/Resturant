export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithBearer } from '@/app/api/_lib/supabase-bearer';
import { resolveSession } from '@/app/api/_lib/resolveSession';

const UUID_RE=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

type RawItem={itemId?:string;id?:string;qty?:number;quantity?:number;notes?:string|null;variant?:any;modifiers?:string[]|null};

export async function POST(req:NextRequest){
  try{
    const { supabase } = getSupabaseWithBearer(req);
    const body = await req.json().catch(()=> ({} as any));

    const restaurantId = body.restaurantId || body.restaurant_id || '';
    const sessionId = body.sessionId || body.session_id;
    const sessionToken = body.sessionToken || body.session_token;
    
    // ✅ your enum is ('pickup','delivery','dine_in')
    const orderType: 'pickup' | 'dine_in' | 'delivery' =
      body.type === 'dine_in' ? 'dine_in' : 
      body.type === 'delivery' ? 'delivery' : 'pickup';
    
    const itemsRaw:RawItem[] = Array.isArray(body.items)? body.items: [];

    if(!UUID_RE.test(restaurantId)) return NextResponse.json({code:'BAD_RESTAURANT'},{status:400});
    if(!sessionId && !sessionToken) return NextResponse.json({code:'BAD_SESSION'},{status:400});
    if(!itemsRaw.length) return NextResponse.json({code:'NO_ITEMS'},{status:400});

    const items = itemsRaw.map(r=>{
      const itemId = r.itemId || r.id || '';
      const qty = Number.isInteger(r.qty)? r.qty : Number(r.quantity)||0;
      return {itemId, qty, notes: r.notes ?? null};
    });
    if(items.some(i=>!i.itemId||(i.qty??0)<=0)) return NextResponse.json({code:'BAD_LINE'},{status:400});

    // Resolve session using the helper
    let session = await resolveSession(supabase, restaurantId, sessionId, sessionToken);
    if ('code' in session) {
      // Auto-mint safety net for legacy widget-* tokens
      if (session.code === 'SESSION_INVALID' && sessionToken && sessionToken.startsWith('widget-')) {
        // soft-mint a new session for active restaurants
        const { data: r } = await supabase.from('restaurants').select('id, is_active').eq('id', restaurantId).maybeSingle();
        if (r?.is_active) {
          const { data: sess, error: sErr } = await supabase
            .from('widget_sessions')
            .insert({ restaurant_id: restaurantId, session_token: sessionToken, locale: 'sv-SE' })
            .select('id').single();
          if (!sErr && sess) {
            // retry resolve
            const again = await resolveSession(supabase, restaurantId, undefined, sessionToken);
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
    const ids = Array.from(new Set(items.map(i=>i.itemId)));
    const { data: menu, error: mErr } = await supabase.from('menu_items').select('id, price_cents, currency').in('id', ids);
    if(mErr) return NextResponse.json({code:'MENU_LOOKUP_ERROR', error:mErr.message},{status:500});
    const map = new Map(menu!.map(m=>[m.id,m]));
    const lines = items.map(i=>{
      const mi = map.get(i.itemId);
      if(!mi) return null;
      return { order_id:'', item_id:i.itemId, qty:i.qty, price_cents: mi.price_cents, notes:i.notes, selections:{} };
    });
    if(lines.some(l=>l===null)) return NextResponse.json({code:'BAD_LINE', why:'unknown item or unavailable'},{status:400});

    const currency = menu?.[0]?.currency || 'SEK';
    const total_cents = (lines as any[]).reduce((s,l)=> s + l.price_cents*l.qty, 0);
    const order_code = genCode(); const pin = orderType==='pickup'? genPin(): null;

    const { data: order, error: oErr } = await supabase.from('orders').insert([{
      restaurant_id: restaurantId, session_id: session.sessionId, type: orderType, status:'pending',
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