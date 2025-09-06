// app/api/dashboard/menus/items/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const env = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  adminKey: process.env.DASHBOARD_ADMIN_KEY,
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

const CreateItemBody = z.object({
  menu_id: z.string().uuid(),
  section_id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  base_price_cents: z.number().int().min(0),
  description: z.string().max(500).optional(),
  is_available: z.boolean().default(true),
  sort_index: z.number().int().default(0),
});

export async function GET(req: Request) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const supaResult = supa();
  if ('err' in supaResult) return supaResult.err;
  
  const { client } = supaResult;
  const url = new URL(req.url);
  const menu_id = url.searchParams.get('menu_id');
  const section_id = url.searchParams.get('section_id');

  if (!menu_id) {
    return NextResponse.json({ code: 'BAD_REQUEST', reason: 'menu_id_required' }, { status: 400 });
  }

  let q = client.from('menu_items_v2').select('*').eq('menu_id', menu_id).order('sort_index', { ascending: true });

  if (section_id) {
    q = q.eq('section_id', section_id);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ code: 'DB_ERROR', error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const parsed = CreateItemBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const supaResult = supa();
  if ('err' in supaResult) return supaResult.err;
  
  const { client } = supaResult;
  const { menu_id, section_id, name, base_price_cents, description, is_available, sort_index } = parsed.data;

  // Check for duplicate item name within the same menu
  const { data: dup } = await client
    .from('menu_items_v2')
    .select('id')
    .eq('menu_id', menu_id)
    .eq('name', name)
    .maybeSingle();
  if (dup) return NextResponse.json({ code: 'ALREADY_EXISTS' }, { status: 409 });

  // Insert item
  const { data, error } = await client
    .from('menu_items_v2')
    .insert({ 
      menu_id, 
      section_id, 
      name, 
      base_price_cents, 
      description, 
      is_available, 
      sort_index 
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ code: 'DB_ERROR', error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}
