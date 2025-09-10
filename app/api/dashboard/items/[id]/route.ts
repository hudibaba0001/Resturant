export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price_cents: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().min(1).optional(),
  image_url: z.string().url().nullable().optional(),
  is_available: z.boolean().optional(),
  menu: z.string().min(1).optional(),
  sectionPath: z.array(z.string()).optional(),
  dietary: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  variants: z.any().optional(),
  modifiers: z.any().optional(),
});

function requireAdmin(req: Request) {
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
  return null;
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (auth) return auth;

  const sb = getSupabaseService();
  const id = ctx.params.id;
  const { data, error } = await sb
    .from('menu_items')
    .select('id, name, description, price_cents, price, currency, image_url, is_available, nutritional_info')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ code: 'ITEM_GET_ERROR', details: error }, { status: 500 });
  if (!data) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (auth) return auth;

  const sb = getSupabaseService();
  const id = ctx.params.id;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });

  const patch: any = {};
  if ('name' in parsed.data) patch.name = parsed.data.name;
  if ('description' in parsed.data) patch.description = parsed.data.description;
  if ('price_cents' in parsed.data) {
    patch.price_cents = parsed.data.price_cents;
    patch.price = parsed.data.price_cents == null ? null : (parsed.data.price_cents / 100);
  }
  if ('currency' in parsed.data) patch.currency = parsed.data.currency;
  if ('image_url' in parsed.data) patch.image_url = parsed.data.image_url;
  if ('is_available' in parsed.data) patch.is_available = parsed.data.is_available;

  if (
    'menu' in parsed.data ||
    'sectionPath' in parsed.data ||
    'dietary' in parsed.data ||
    'allergens' in parsed.data ||
    'variants' in parsed.data ||
    'modifiers' in parsed.data
  ) {
    const { data: cur } = await sb
      .from('menu_items')
      .select('nutritional_info')
      .eq('id', id)
      .maybeSingle();

    const ni = { ...(cur?.nutritional_info || {}) };
    if ('menu' in parsed.data) ni.menu = parsed.data.menu;
    if ('sectionPath' in parsed.data) ni.section_path = parsed.data.sectionPath;
    if ('dietary' in parsed.data) ni.dietary = parsed.data.dietary;
    if ('allergens' in parsed.data) ni.allergens = parsed.data.allergens;
    if ('variants' in parsed.data) ni.variants = parsed.data.variants;
    if ('modifiers' in parsed.data) ni.modifiers = parsed.data.modifiers;
    patch.nutritional_info = ni;
  }

  const { data, error } = await sb
    .from('menu_items')
    .update(patch)
    .eq('id', id)
    .select('id, name, description, price_cents, currency, image_url, is_available, nutritional_info')
    .single();

  if (error) return NextResponse.json({ code: 'ITEM_UPDATE_ERROR', details: error }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const auth = requireAdmin(_req);
  if (auth) return auth;

  const sb = getSupabaseService();
  const id = ctx.params.id;
  const { error } = await sb.from('menu_items').delete().eq('id', id);
  if (error) return NextResponse.json({ code: 'ITEM_DELETE_ERROR', details: error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
