// app/api/dashboard/menus/items/[id]/route.ts
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
  return { client: createClient(env.url, env.key, { auth: { persistSession: false } }) } as const;
}

function requireAdmin(req: Request) {
  const h = req.headers.get('x-admin-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!env.adminKey || !h || h !== env.adminKey) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  return null;
}

const PatchItemBody = z.object({
  name: z.string().min(1).max(120).optional(),
  base_price_cents: z.number().int().min(0).optional(),
  description: z.string().max(500).optional(),
  is_available: z.boolean().optional(),
  sort_index: z.number().int().optional(),
  section_id: z.string().uuid().optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const id = ctx.params.id;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ code: 'BAD_REQUEST', reason: 'invalid_id' }, { status: 400 });
  }

  const parsed = PatchItemBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const supaResult = supa();
  if ('err' in supaResult) return supaResult.err;
  
  const { client } = supaResult;
  const patch = { ...parsed.data };

  const { data, error } = await client
    .from('menu_items_v2')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ code: 'DB_ERROR', error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const id = ctx.params.id;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ code: 'BAD_REQUEST', reason: 'invalid_id' }, { status: 400 });
  }

  const supaResult = supa();
  if ('err' in supaResult) return supaResult.err;
  
  const { client } = supaResult;
  const { error } = await client.from('menu_items_v2').delete().eq('id', id);
  if (error) {
    // if FK prevents delete (existing orders), surface conflict
    const status = /foreign key|constraint/i.test(error.message) ? 409 : 500;
    return NextResponse.json({ code: 'DELETE_FAILED', error: error.message }, { status });
  }
  return NextResponse.json({ ok: true });
}
