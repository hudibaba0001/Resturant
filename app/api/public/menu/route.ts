export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseService } from '@/lib/supabase/service';

const Q = z.object({ restaurantId: z.string().uuid(), menu: z.string().min(1) });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Q.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ code: 'BAD_REQUEST', issues: parsed.error.issues }, { status: 400 });
  }

  const { restaurantId, menu } = parsed.data;
  const sb = getSupabaseService();

  const { data, error } = await sb
    .from('menu_items')
    .select('id,name,description,price_cents,price,currency,is_available,category,section_path,tags,details,variant_groups,modifier_groups')
    .eq('restaurant_id', restaurantId)
    .eq('category', menu)
    .eq('is_available', true)
    .order('section_path')
    .order('name');

  if (error) return NextResponse.json({ code: 'DB_ERROR', details: error }, { status: 500 });
  return NextResponse.json({ ok: true, data }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
