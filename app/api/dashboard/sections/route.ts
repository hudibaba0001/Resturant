export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const BodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  // Accept either key; UI might send restaurant_id,
  // earlier examples sent menu_id (actually restaurant id)
  restaurant_id: z.string().uuid().optional(),
  menu_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'INVALID_INPUT', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = parsed.data;
    const restaurant_id = parsed.data.restaurant_id ?? parsed.data.menu_id;
    
    if (!restaurant_id) {
      return NextResponse.json(
        { code: 'MISSING_RESTAURANT_ID', message: 'restaurant_id or menu_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const insertRow = {
      restaurant_id,
      name,
      position: 0,
    };

    const { data, error } = await supabase
      .from('menu_sections')
      .insert(insertRow)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { code: 'SECTION_CREATE_FAILED', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, section: data });
  } catch (err: any) {
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

const ListSectionsQuery = z.object({
  restaurantId: z.string().uuid(),
  menu: z.string().min(1),
});

export async function GET(req: Request) {
  const supabase = getSupabase();
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
