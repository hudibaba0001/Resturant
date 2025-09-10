export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

const CreateSchema = z.object({
  // Accept either restaurantId or menu_id
  restaurantId: z.string().uuid().optional(),
  menu_id: z.string().uuid().optional(),
  menu: z.string().min(1).optional(),
  // Accept either sectionPath array or section string
  sectionPath: z.array(z.string()).optional().default([]),
  section: z.string().optional(),
  name: z.string().min(1),
  description: z.string().trim().optional().transform(v => (v && v.length ? v : null)),
  // Accept either price_cents or price
  price_cents: z.number().int().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional().default('SEK').transform(v => v.toUpperCase().slice(0, 3)),
  image_url: z.string().url().optional(),
  is_available: z.boolean().optional().default(true),
  dietary: z.array(z.string()).optional().default([]),
  allergens: z.array(z.string()).optional().default([]),
  variants: z.any().optional(),
  modifiers: z.any().optional(),
}).refine(data => data.restaurantId || data.menu_id, {
  message: "Either restaurantId or menu_id is required",
  path: ["restaurantId"]
}).refine(data => typeof data.price_cents === 'number' || typeof data.price === 'number', {
  message: 'Either price_cents or price is required',
  path: ['price_cents']
});

export async function POST(req: Request) {
  // Admin authentication
  const adminKeyEnv = process.env.DASHBOARD_ADMIN_KEY;
  if (!adminKeyEnv) {
    return NextResponse.json(
      { code: 'SERVER_MISCONFIG', missing: { DASHBOARD_ADMIN_KEY: true } },
      { status: 500 }
    );
  }
  const provided = req.headers.get('x-admin-key');
  if (provided !== adminKeyEnv) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const sb = getSupabaseService();
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ 
      code: 'BAD_REQUEST', 
      message: 'Invalid item payload',
      issues: parsed.error.issues 
    }, { status: 400 });
  }

  const {
    restaurantId, menu_id, menu, sectionPath, section, name, description,
    price_cents, price, currency, image_url, is_available, dietary, allergens, variants, modifiers,
  } = parsed.data;

  // Resolve restaurant ID and menu
  const finalRestaurantId = restaurantId || menu_id;
  const finalMenu = menu || 'main';
  
  // Resolve section path
  const finalSectionPath = sectionPath || (section ? [section] : []);
  
  // Resolve price in cents
  const finalPriceCents = price_cents || (price ? Math.round(price * 100) : null);
  // Resolve legacy decimal price (NOT NULL in some schemas)
  const finalPrice = typeof price === 'number'
    ? parseFloat(price.toFixed(2))
    : (typeof finalPriceCents === 'number' ? parseFloat((finalPriceCents / 100).toFixed(2)) : null);

  const nutritional_info = {
    menu: finalMenu,
    section_path: finalSectionPath,
    dietary,
    allergens,
    variants,
    modifiers,
  };

  const { data, error } = await sb
    .from('menu_items')
    .insert({
      restaurant_id: finalRestaurantId,
      name,
      description,
      // Maintain compatibility with legacy schemas
      price: finalPrice,
      price_cents: finalPriceCents,
      currency,
      image_url: image_url ?? null,
      is_available,
      nutritional_info,
    })
    .select('id, name, description, price_cents, currency, image_url, is_available, nutritional_info')
    .single();

  if (error) {
    return NextResponse.json(
      { code: 'ITEM_CREATE_ERROR', message: 'DB insert failed', details: error },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, data });
}

const ListQuery = z.object({
  restaurantId: z.string().uuid().optional(),
  menu_id: z.string().uuid().optional(),
  menu: z.string().min(1).optional(),
  section: z.string().optional(),
}).refine(data => data.restaurantId || data.menu_id, {
  message: "Either restaurantId or menu_id is required",
  path: ["restaurantId"]
});

export async function GET(req: Request) {
  // Admin authentication
  const adminKeyEnv = process.env.DASHBOARD_ADMIN_KEY;
  if (!adminKeyEnv) {
    return NextResponse.json(
      { code: 'SERVER_MISCONFIG', missing: { DASHBOARD_ADMIN_KEY: true } },
      { status: 500 }
    );
  }
  const provided = req.headers.get('x-admin-key');
  if (provided !== adminKeyEnv) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const sb = getSupabaseService();
  const { searchParams } = new URL(req.url);
  const parsed = ListQuery.safeParse({
    restaurantId: searchParams.get('restaurantId') || undefined,
    menu_id: searchParams.get('menu_id') || undefined,
    menu: searchParams.get('menu') || undefined,
    section: searchParams.get('section') || undefined,
  });
  if (!parsed.success) return NextResponse.json({ 
    code: 'BAD_REQUEST', 
    message: 'Invalid query parameters',
    issues: parsed.error.issues 
  }, { status: 400 });

  const { restaurantId, menu_id, menu, section } = parsed.data;
  const finalRestaurantId = restaurantId || menu_id;
  const finalMenu = menu || 'main';

  const { data, error } = await sb
    .from('menu_items')
    .select('id, name, description, price_cents, currency, image_url, is_available, nutritional_info')
    .eq('restaurant_id', finalRestaurantId);

  if (error) {
    return NextResponse.json(
      { code: 'ITEMS_LIST_ERROR', message: 'DB select failed', details: error },
      { status: 500 }
    );
  }

  const items = (data ?? []).filter((row: any) => {
    const ni = row.nutritional_info || {};
    if (ni.menu !== finalMenu) return false;
    if (section) return (ni.section_path || [])[0] === section;
    return true;
  });

  return NextResponse.json({ ok: true, data: items });
}
