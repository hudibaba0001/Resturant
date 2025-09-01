export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for API routes using anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CreateSectionSchema = z.object({
  restaurantId: z.string().uuid(),
  menu: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  sortIndex: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateSectionSchema.safeParse(body);
  
  if (!parsed.success) {
    console.log("Section creation validation failed:", parsed.error);
    return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });
  }

  const { restaurantId, menu, name, description, sortIndex, isActive } = parsed.data;

  // Check if section already exists
  const { data: existing } = await supabase
    .from('menu_items')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('nutritional_info->>menu', menu)
    .eq('nutritional_info->>section_path', JSON.stringify([name]))
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ code: 'SECTION_EXISTS' }, { status: 409 });
  }

  // Create a placeholder item to represent the section
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: restaurantId,
      name: `[SECTION] ${name}`,
      description: description || `Section: ${name}`,
      price_cents: null,
      currency: 'SEK',
      image_url: null,
      is_available: isActive,
      nutritional_info: {
        menu,
        section_path: [name],
        is_section: true,
        sort_index: sortIndex,
        description,
      },
    })
    .select('id, name, nutritional_info')
    .single();

  if (error) {
    console.log("Section creation error:", error);
    return NextResponse.json({ code: 'SECTION_CREATE_ERROR' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true, data });
}

const ListSectionsQuery = z.object({
  restaurantId: z.string().uuid(),
  menu: z.string().min(1),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = ListSectionsQuery.safeParse({
    restaurantId: searchParams.get('restaurantId') || '',
    menu: searchParams.get('menu') || '',
  });
  
  if (!parsed.success) {
    return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });
  }

  const { restaurantId, menu } = parsed.data;

  // Get all items for this menu and extract unique sections
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, nutritional_info')
    .eq('restaurant_id', restaurantId);

  if (error) {
    return NextResponse.json({ code: 'SECTIONS_LIST_ERROR' }, { status: 500 });
  }

  // Extract unique sections from nutritional_info
  const sections = new Map();
  (data || []).forEach(item => {
    const ni = item.nutritional_info || {};
    if (ni.menu === menu && ni.section_path && ni.section_path.length > 0) {
      const sectionName = ni.section_path[0];
      if (!sections.has(sectionName)) {
        sections.set(sectionName, {
          name: sectionName,
          itemCount: 0,
          isActive: true,
        });
      }
      // Count items in this section (excluding section placeholders)
      if (!ni.is_section) {
        sections.get(sectionName).itemCount++;
      }
    }
  });

  const sectionsList = Array.from(sections.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  return NextResponse.json({ ok: true, data: sectionsList });
}
