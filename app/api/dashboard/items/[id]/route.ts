export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  price_cents: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  image_url: z.string().url().nullable().optional(),
  is_available: z.boolean().optional(),
  // Canonical columns below
  section_path: z.array(z.string().min(1)).min(1).optional(),
  category: z.string().min(1).optional(),
  variants: z.array(z.any()).optional(),          // maps to variant_groups
  modifiers: z.array(z.any()).optional(),         // maps to modifier_groups
  tags: z.array(z.string()).optional(),
  details: z.record(z.any()).optional(),
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
    .select('id,name,description,price_cents,price,currency,image_url,is_available,restaurant_id,category,section_path,section_id')
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
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'BAD_REQUEST', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const patch: any = {};
  if ('name' in parsed.data) patch.name = parsed.data.name;
  if ('description' in parsed.data) patch.description = parsed.data.description;
  if (typeof parsed.data.price_cents === 'number') {
    patch.price_cents = parsed.data.price_cents;
    patch.price = parsed.data.price_cents / 100; // keep DECIMAL column in sync
  }
  if ('currency' in parsed.data) patch.currency = parsed.data.currency;
  if ('image_url' in parsed.data) patch.image_url = parsed.data.image_url;
  if ('is_available' in parsed.data) patch.is_available = parsed.data.is_available;
  // Canonical structure fields
  if ('section_path' in parsed.data) patch.section_path = parsed.data.section_path;
  if ('category' in parsed.data) patch.category = parsed.data.category;
  if ('variants' in parsed.data) patch.variant_groups = parsed.data.variants;
  if ('modifiers' in parsed.data) patch.modifier_groups = parsed.data.modifiers;
  if ('tags' in parsed.data) patch.tags = parsed.data.tags;
  if ('details' in parsed.data) patch.details = parsed.data.details;

  const { data, error } = await sb
    .from('menu_items')
    .update(patch)
    .eq('id', id)
    .select('id,name,description,price_cents,price,currency,image_url,is_available,restaurant_id,category,section_path,section_id')
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
  return new NextResponse(null, { status: 204 });
}
