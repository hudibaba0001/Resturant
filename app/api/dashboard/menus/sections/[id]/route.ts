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
  sort_index: z.number().int().optional(),
  // add other updatable fields later (e.g., is_active)
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

  const supaResult = supa();
  if ('err' in supaResult) return supaResult.err;
  
  const { client } = supaResult;
  const patch: Record<string, unknown> = { ...parsed.data };
  if (patch.name) patch['path'] = [patch.name as string];

  const { data, error } = await client
    .from('menu_sections_v2')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ code: 'DB_ERROR', error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ ok: true, section: data });
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

  // Load the section to derive restaurant and menu slug
  const { data: section, error: sErr } = await client
    .from('menu_sections_v2')
    .select('id, menu_id, path')
    .eq('id', id)
    .maybeSingle();
  if (sErr) return NextResponse.json({ code: 'DB_ERROR', details: sErr }, { status: 500 });
  if (!section) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  const leafName = Array.isArray((section as any).path) && (section as any).path.length > 0
    ? (section as any).path[(section as any).path.length - 1]
    : null;

  // Resolve menu slug and restaurant reference via menus_v2
  let menuSlug: string | null = null;
  let menuRestaurantId: string | null = null;
  if ((section as any).menu_id) {
    const { data: menuRow, error: mErr } = await client
      .from('menus_v2')
      .select('slug, restaurant_id')
      .eq('id', (section as any).menu_id)
      .maybeSingle();
    if (mErr) return NextResponse.json({ code: 'DB_ERROR', details: mErr }, { status: 500 });
    menuSlug = (menuRow as any)?.slug ?? null;
    menuRestaurantId = (menuRow as any)?.restaurant_id ?? null;
  }

  // Guard: if any items exist in canonical table for this section, block delete
  if (leafName && menuSlug && menuRestaurantId) {
    const { count, error: cErr } = await client
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', menuRestaurantId)
      .eq('category', menuSlug)
      .contains('section_path', [leafName]);
    if (cErr) return NextResponse.json({ code: 'DB_ERROR', details: cErr }, { status: 500 });
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { code: 'SECTION_NOT_EMPTY', message: `Section has ${count} item(s). Move or remove items first.` },
        { status: 409 }
      );
    }
  }

  // Proceed with delete
  const { data, error } = await client
    .from('menu_sections_v2')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    const status = /foreign key|constraint/i.test(error.message) ? 409 : 500;
    return NextResponse.json({ code: 'DELETE_FAILED', error: error.message }, { status });
  }
  if (!data) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  // Success: no content
  return new NextResponse(null, { status: 204 });
}
