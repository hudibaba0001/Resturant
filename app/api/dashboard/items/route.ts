export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

const CreateSchema = z.object({
  restaurantId: z.string().uuid(),
  menu: z.string().min(1),
  sectionPath: z.array(z.string()).optional().default([]),
  name: z.string().min(1),
  description: z.string().trim().optional().transform(v => (v && v.length ? v : null)),
  price_cents: z.number().int().nonnegative().optional(),
  currency: z.string().min(1).optional().default('SEK'),
  image_url: z.string().url().optional(),
  is_available: z.boolean().optional().default(true),
  dietary: z.array(z.string()).optional().default([]),
  allergens: z.array(z.string()).optional().default([]),
  variants: z.any().optional(),
  modifiers: z.any().optional(),
});

export async function POST(req: Request) {
  const sb = await getSupabaseServer();
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });

  const {
    restaurantId, menu, sectionPath, name, description,
    price_cents, currency, image_url, is_available, dietary, allergens, variants, modifiers,
  } = parsed.data;

  const nutritional_info = {
    menu,
    section_path: sectionPath,
    dietary,
    allergens,
    variants,
    modifiers,
  };

  const { data, error } = await sb
    .from('menu_items')
    .insert({
      restaurant_id: restaurantId,
      name,
      description,
      price_cents: price_cents ?? null,
      currency,
      image_url: image_url ?? null,
      is_available,
      nutritional_info,
    })
    .select('id, name, description, price_cents, currency, image_url, is_available, nutritional_info')
    .single();

  if (error) return NextResponse.json({ code: 'ITEM_CREATE_ERROR' }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

const ListQuery = z.object({
  restaurantId: z.string().uuid(),
  menu: z.string().min(1),
  section: z.string().optional(),
});

export async function GET(req: Request) {
  const sb = await getSupabaseServer();
  const { searchParams } = new URL(req.url);
  const parsed = ListQuery.safeParse({
    restaurantId: searchParams.get('restaurantId') || '',
    menu: searchParams.get('menu') || '',
    section: searchParams.get('section') || undefined,
  });
  if (!parsed.success) return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });

  const { restaurantId, menu, section } = parsed.data;

  const { data, error } = await sb
    .from('menu_items')
    .select('id, name, description, price_cents, currency, image_url, is_available, nutritional_info')
    .eq('restaurant_id', restaurantId);

  if (error) return NextResponse.json({ code: 'ITEMS_LIST_ERROR' }, { status: 500 });

  const items = (data ?? []).filter((row: any) => {
    const ni = row.nutritional_info || {};
    if (ni.menu !== menu) return false;
    if (section) return (ni.section_path || [])[0] === section;
    return true;
  });

  return NextResponse.json({ ok: true, data: items });
}
