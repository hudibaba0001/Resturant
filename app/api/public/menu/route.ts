// Never prerender this API
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { safeRoute, jsonError } from '@/lib/errors';
import { corsHeaders } from '@/lib/cors';
// Adjust the import path if your repo uses a different location:
import { MenuRepository } from '@/lib/menuRepo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// TODO: Drive this from DB (restaurants.allowed_origins) post-MVP
const ALLOWLIST = [
  'https://resturant.vercel.app',
  'https://resturant-two-xi.vercel.app',
];

export const OPTIONS = (req: NextRequest) =>
  new NextResponse(null, {
    headers: corsHeaders(req.headers.get('origin') || '', ALLOWLIST),
  });

export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || '';
    const headers = corsHeaders(origin, ALLOWLIST);

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || '';
    const menuIdParam = searchParams.get('menuId') || '';
    const includeUnavailable = (searchParams.get('includeUnavailable') || 'false') === 'true';

    if (!restaurantId) return jsonError('MISSING_RESTAURANT_ID', 400);
    if (!UUID.test(restaurantId)) return jsonError('INVALID_RESTAURANT_ID', 400);

    const repo = new MenuRepository('simple');

    // Pick menu: explicit param or first available
    const menus = await repo.listMenus(restaurantId);
    if (!menus || menus.length === 0) {
      return new NextResponse(JSON.stringify({ sections: [] }), { status: 200, headers });
    }
    const chosenMenuId = menuIdParam || menus[0].id;

    // Sections + items (supports nested via section.path)
    const sections = await repo.listSections(restaurantId, chosenMenuId);

    const sectionPayload = await Promise.all(
      sections.map(async (section) => {
        const items = await repo.listItems(restaurantId, chosenMenuId, (section as any).path || []);
        const filtered = includeUnavailable ? items : items.filter((i: any) => i.is_available !== false);

        return {
          id: section.id,
          name: section.name,
          path: (section as any).path || [],
          items: filtered.map((i: any) => ({
            id: i.id, // <- UUID from DB, used by orders API
            name: i.name,
            description: i.description ?? null,
            price_cents: i.price_cents ?? null,
            currency: i.currency ?? 'SEK',
            image_url: i.image_url ?? null,
            allergens: i.allergens ?? [],
            dietary: i.dietary ?? [],
            is_available: i.is_available !== false,
          })),
        };
      })
    );

    return new NextResponse(JSON.stringify({ sections: sectionPayload }), { status: 200, headers });
  } catch (error) {
    console.error('Menu lookup error:', error);
    return jsonError('MENU_LOOKUP_ERROR', 500);
  }
}
