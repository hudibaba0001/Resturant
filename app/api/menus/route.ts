export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, jsonOk, safeRoute } from '@/lib/errors';
import { getSupabaseServer } from '@/lib/supabaseServer';

const CreateSchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(80),
});

const SlugSchema = z
  .string()
  .min(1)
  .max(80)
  .transform((s) =>
    s
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );

export const GET = safeRoute(async (req: Request) => {
  const sb = await getSupabaseServer();
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurantId') || '';

  if (!restaurantId) return jsonError('MISSING_RESTAURANT_ID', 400);

  const { data, error } = await sb
    .from('menus')
    .select('id, slug, name, sort_index, is_active, created_at')
    .eq('restaurant_id', restaurantId)
    .order('sort_index', { ascending: true });

  if (error) return jsonError('MENUS_LIST_ERROR', 500);
  return jsonOk({ menus: data ?? [] });
}, 'MENUS_LIST_ERROR');

export const POST = safeRoute(async (req: Request) => {
  const sb = await getSupabaseServer();
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return jsonError('BAD_REQUEST', 400);

  const { restaurantId, name } = parsed.data;
  const slug = SlugSchema.parse(name || 'menu');

  // ensure uniqueness per restaurant (append -2, -3, ... if needed)
  let finalSlug = slug;
  for (let n = 2; n <= 50; n++) {
    const { data: exists, error: e2 } = await sb
      .from('menus')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('slug', finalSlug)
      .maybeSingle();
    if (e2) break;
    if (!exists) break;
    finalSlug = `${slug}-${n}`;
  }

  const { data, error } = await sb
    .from('menus')
    .insert({
      restaurant_id: restaurantId,
      slug: finalSlug,
      name,
    })
    .select('id, slug, name')
    .single();

  if (error) return jsonError('MENU_CREATE_ERROR', 500);
  return jsonOk({ menu: data });
}, 'MENU_CREATE_ERROR');
