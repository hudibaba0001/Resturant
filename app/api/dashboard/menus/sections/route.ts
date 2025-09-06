// app/api/dashboard/menus/sections/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const env = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  adminKey: process.env.DASHBOARD_ADMIN_KEY, // same header you used for /api/dashboard/orders
};

function supa() {
  if (!env.url || !env.key) {
    return { err: NextResponse.json({ code: 'SERVER_MISCONFIG' }, { status: 500 }) } as const;
  }
  return {
    client: createClient(env.url, env.key, { auth: { persistSession: false } }),
  } as const;
}

function requireAdmin(req: Request) {
  const h = req.headers.get('x-admin-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!env.adminKey || !h || h !== env.adminKey) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null;
}

const CreateBody = z.object({
  // allow either menu_id OR restaurant_id to keep the UI flexible
  menu_id: z.string().uuid().optional(),
  restaurant_id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
}).refine(v => v.menu_id || v.restaurant_id, { message: 'menu_id or restaurant_id is required' });

export async function GET(req: Request) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const supaResult = supa();
  if ('err' in supaResult) return supaResult.err;
  
  const { client } = supaResult;
  const url = new URL(req.url);
  const menu_id = url.searchParams.get('menu_id');
  const restaurant_id = url.searchParams.get('restaurant_id');

  if (!menu_id && !restaurant_id) {
    return NextResponse.json({ code: 'BAD_REQUEST', reason: 'menu_id_or_restaurant_id_required' }, { status: 400 });
  }

  let q = client.from('menu_sections_v2').select('*').order('created_at', { ascending: true });

  if (menu_id) q = q.eq('menu_id', menu_id);
  if (restaurant_id) q = q.eq('restaurant_id', restaurant_id);

  const { data, error } = await q;
  if (error) return NextResponse.json({ code: 'DB_ERROR', error: error.message }, { status: 500 });
  return NextResponse.json({ sections: data ?? [] });
}

export async function POST(req: Request) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const supaResult = supa();
  if ('err' in supaResult) return supaResult.err;
  
  const { client } = supaResult;
  const { name } = parsed.data;
  let { menu_id } = parsed.data;
  const { restaurant_id } = parsed.data;

  // If caller passed only restaurant_id, resolve or create a default menu
  if (!menu_id && restaurant_id) {
    const { data: existingMenu, error: mErr } = await client
      .from('menus_v2')
      .select('id')
      .eq('restaurant_id', restaurant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mErr) return NextResponse.json({ code: 'DB_ERROR', error: mErr.message }, { status: 500 });

    if (existingMenu?.id) {
      menu_id = existingMenu.id;
    } else {
      const { data: createdMenu, error: cErr } = await client
        .from('menus_v2')
        .insert({ restaurant_id, name: 'Main', slug: 'main' })
        .select('id')
        .single();
      if (cErr) return NextResponse.json({ code: 'DB_ERROR', error: cErr.message }, { status: 500 });
      menu_id = createdMenu.id;
    }
  }

  if (!menu_id) {
    return NextResponse.json({ code: 'BAD_REQUEST', reason: 'menu_id_required' }, { status: 400 });
  }

  // Optional: prevent duplicates
  const { data: dup } = await client
    .from('menu_sections_v2')
    .select('id')
    .eq('menu_id', menu_id)
    .eq('name', name)
    .maybeSingle();
  if (dup) return NextResponse.json({ code: 'ALREADY_EXISTS' }, { status: 409 });

  // Insert section; store a simple path (array) for future nesting
  const { data, error } = await client
    .from('menu_sections_v2')
    .insert({ menu_id, restaurant_id, name, path: [name] })
    .select('*')
    .single();

  if (error) return NextResponse.json({ code: 'DB_ERROR', error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, section: data });
}