export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/service';

// Canonical payload for create (after normalization)
const ItemCreateSchema = z.object({
  restaurant_id: z.string().uuid(),
  category: z.string().min(1), // menu slug, e.g. "main"
  section_path: z.array(z.string()).min(1),
  name: z.string().min(1),
  description: z.string().trim().nullable().optional(),
  price_cents: z.number().int().nonnegative(),
  price: z.number().nonnegative(),
  currency: z.string().min(1).transform(v => v.toUpperCase().slice(0, 3)),
  image_url: z.string().url().nullable().optional(),
  is_available: z.boolean().default(true),
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
  const raw: any = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ code: 'BAD_REQUEST', message: 'Expected JSON body' }, { status: 400 });
  }

  // Normalize incoming keys to canonical columns
  const restaurant_id: string | null = raw.restaurant_id ?? raw.restaurantId ?? null;
  const category: string | null = raw.category ?? raw.menu ?? null;
  const section_path: string[] | null = Array.isArray(raw.section_path)
    ? raw.section_path
    : (typeof raw.section === 'string' ? [raw.section] : null);
  let price_cents: number | null = (typeof raw.price_cents === 'number')
    ? raw.price_cents
    : (typeof raw.price === 'number' ? Math.round(raw.price * 100) : null);
  const currency: string = (raw.currency ?? 'SEK');
  const name: string | null = raw.name ?? null;
  const description: string | null = (raw.description ?? null);
  const image_url: string | null = (raw.image_url ?? null);
  const is_available: boolean = (typeof raw.is_available === 'boolean') ? raw.is_available : true;

  if (price_cents != null && !Number.isInteger(price_cents)) {
    price_cents = Math.round(price_cents as number);
  }
  const price: number | null = price_cents != null ? parseFloat((price_cents / 100).toFixed(2)) : null;

  const parsed = ItemCreateSchema.safeParse({
    restaurant_id,
    category,
    section_path,
    name,
    description,
    price_cents,
    price,
    currency,
    image_url,
    is_available,
  });
  if (!parsed.success) {
    return NextResponse.json({
      code: 'BAD_REQUEST',
      message: 'Invalid item payload',
      issues: parsed.error.issues,
    }, { status: 400 });
  }

  const data = parsed.data;

  const { data: created, error } = await sb
    .from('menu_items')
    .insert({
      restaurant_id: data.restaurant_id,
      category: data.category,
      section_path: data.section_path,
      name: data.name,
      description: data.description ?? null,
      price_cents: data.price_cents,
      price: data.price, // keep DECIMAL in sync
      currency: data.currency,
      image_url: data.image_url ?? null,
      is_available: data.is_available,
    })
    .select('id,name,description,price_cents,price,currency,image_url,is_available,restaurant_id,category,section_path')
    .single();

  if (error) {
    return NextResponse.json(
      { code: 'ITEM_CREATE_ERROR', message: 'DB insert failed', details: error },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, data: created }, { status: 201 });
}

const AdminKey = process.env.DASHBOARD_ADMIN_KEY || process.env.ADMIN_KEY;

const ListQuery = z.object({
  restaurant_id: z.string().uuid().optional(),
  restaurantId: z.string().uuid().optional(),
  category: z.string().min(1).optional(),
  menu: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  if (req.headers.get('x-admin-key') !== AdminKey) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = ListQuery.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: 'BAD_REQUEST', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const p = parsed.data;
  const restaurant_id = p.restaurant_id ?? p.restaurantId ?? null;
  const category = p.category ?? p.menu ?? null;
  const { limit, offset, q, section } = p;

  const sb = getSupabaseService();
  let query = sb
    .from('menu_items')
    .select('id,name,description,price_cents,price,currency,image_url,is_available,restaurant_id,category,section_path', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (restaurant_id) query = query.eq('restaurant_id', restaurant_id);
  if (category) query = query.eq('category', category);
  if (section) query = query.contains('section_path', [section]);
  if (q) query = query.ilike('name', `%${q}%`);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, code: 'DB_ERROR', message: 'List failed', details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data, count }, { status: 200 });
}
