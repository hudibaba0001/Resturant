import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase/server';

const Q = z.object({ restaurantId: z.string().uuid(), menu: z.string().optional() });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = Q.parse(Object.fromEntries(url.searchParams));
  const menu = url.searchParams.get('menu') ?? 'main';

  const supabase = getServerSupabase();

  // 1) menu
  const { data: menus, error: mErr } = await supabase
    .from('menus_v2').select('id')
    .eq('restaurant_id', q.restaurantId).eq('slug', menu).limit(1);
  if (mErr) throw mErr;
  const menuRow = menus?.[0];
  if (!menuRow) return NextResponse.json({ sections: [] });

  // 2) sections
  const { data: sections, error: sErr } = await supabase
    .from('menu_sections_v2').select('id, path').eq('menu_id', menuRow.id);
  if (sErr) throw sErr;
  const sectionIds = (sections ?? []).map(s => s.id);
  if (!sectionIds.length) return NextResponse.json({ sections: [] });

  // 3) items
  const { data: items, error: iErr } = await supabase
    .from('menu_items_v2')
    .select('id, name, description, is_available, base_price_cents, section_id, sort_index')
    .eq('restaurant_id', q.restaurantId)
    .in('section_id', sectionIds)
    .order('sort_index', { ascending: true });
  if (iErr) throw iErr;

  // 4) assemble identical shape the widget expects
  const pathBySection: Record<string, string[]> =
    Object.fromEntries((sections ?? []).map(s => [s.id, s.path]));
  const sectionMap = new Map<string, { name: string; path: string[]; items: any[] }>();

  for (const r of items ?? []) {
    const path = pathBySection[r.section_id] ?? [];
    const key = JSON.stringify(path);
    if (!sectionMap.has(key)) {
      sectionMap.set(key, { name: path.at(-1) ?? 'Menu', path, items: [] });
    }
    sectionMap.get(key)!.items.push({
      id: r.id,
      name: r.name?.en ?? '',
      price: r.base_price_cents,
      description: r.description?.en ?? null,
      isActive: r.is_available,
    });
  }

  return NextResponse.json({ sections: Array.from(sectionMap.values()) });
}
