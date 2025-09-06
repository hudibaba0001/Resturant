// app/api/dashboard/menus/sections/[id]/route.ts
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

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  // add other updatable fields later (e.g., position, is_active)
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const id = ctx.params.id;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ code: 'BAD_REQUEST', reason: 'invalid_id' }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const { client } = supa();
  const patch: Record<string, unknown> = { ...parsed.data };
  if (patch.name) patch['path'] = [patch.name as string];

  const { data, error } = await client
    .from('menu_sections_v2')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ code: 'DB_ERROR', error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, section: data });
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const id = ctx.params.id;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ code: 'BAD_REQUEST', reason: 'invalid_id' }, { status: 400 });
  }

  const { client } = supa();
  const { error } = await client.from('menu_sections_v2').delete().eq('id', id);
  if (error) {
    // if FK prevents delete (existing items), surface conflict
    const status = /foreign key|constraint/i.test(error.message) ? 409 : 500;
    return NextResponse.json({ code: 'DELETE_FAILED', error: error.message }, { status });
  }
  return NextResponse.json({ ok: true });
}
