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
  description: z.string().optional().default(''),
  price_cents: z.number().int().nonnegative().optional(),
  currency: z.string().min(1).optional().default('SEK'),
  image_url: z.string().url().optional(),
  is_available: z.boolean().optional().default(true),
  dietary: z.array(z.string()).optional().default([]),
  allergens: z.array(z.string()).optional().default([]),
  variants: z.any().optional(),  // keep flexible for MVP
  modifiers: z.any().optional(),
});

export async function POST(req: Request) {
  const sb = await getSupabaseServer();
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });
  }
  const {
    restaurantId, menu, sectionPath, name, description,
    price_cents, currency, image_url, is_available,
    dietary, allergens, variants, modifiers,
  } = parsed.data;

  const nutritional_info = {
    menu,                       // slug or human name, your choice
    section_path: sectionPath,  // ['Lunch','Burgers'] etc
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
      image_url: image_url ?? null,
      is_available,
      price_cents: price_cents ?? null,
      currency,
      nutritional_info,
    })
    .select('id, name, price_cents, currency, image_url, is_available, nutritional_info')
    .single();

  if (error) return NextResponse.json({ code: 'ITEM_CREATE_ERROR' }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

const ListQuery = z.object({
  restaurantId: z.string().uuid(),
  menu: z.string().min(1),
  section: z.string().optional(), // first-level section filter
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

  // fetch and filter in SQL where possible
  const { data, error } = await sb
    .from('menu_items')
    .select('id, name, description, price_cents, currency, image_url, is_available, nutritional_info')
    .eq('restaurant_id', restaurantId);

  if (error) return NextResponse.json({ code: 'ITEMS_LIST_ERROR' }, { status: 500 });

  const items = (data ?? []).filter((row: any) => {
    const ni = row.nutritional_info || {};
    if (ni.menu !== menu) return false;
    if (section) {
      const sp = ni.section_path || [];
      return sp[0] === section;
    }
    return true;
  });

  return NextResponse.json({ ok: true, data: items });
}
