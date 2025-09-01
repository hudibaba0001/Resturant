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

const UpdateSectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortIndex: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSectionSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });
  }

  const { name: newSectionName, description, sortIndex, isActive } = parsed.data;

  // Get current section info
  const { data: current, error: fetchError } = await supabase
    .from('menu_items')
    .select('id, restaurant_id, nutritional_info')
    .eq('id', id)
    .eq('nutritional_info->>is_section', 'true')
    .maybeSingle();

  if (fetchError || !current) {
    return NextResponse.json({ code: 'SECTION_NOT_FOUND' }, { status: 404 });
  }

  const ni = current.nutritional_info || {};
  const oldSectionName = ni.section_path?.[0];

  // If section name changed, update all items in that section
  if (oldSectionName && oldSectionName !== newSectionName) {
    // Get all items in the old section
    const { data: itemsToUpdate } = await supabase
      .from('menu_items')
      .select('id, nutritional_info')
      .eq('restaurant_id', current.restaurant_id)
      .eq('nutritional_info->>menu', ni.menu)
      .eq('nutritional_info->>section_path', JSON.stringify([oldSectionName]));

    // Update each item's section_path
    if (itemsToUpdate) {
      for (const item of itemsToUpdate) {
        const itemNi = { ...item.nutritional_info };
        itemNi.section_path = [newSectionName];
        
        await supabase
          .from('menu_items')
          .update({ nutritional_info: itemNi })
          .eq('id', item.id);
      }
    }
  }

  // Update the section placeholder item
  const { data, error } = await supabase
    .from('menu_items')
    .update({
      name: `[SECTION] ${newSectionName}`,
      description: description || `Section: ${newSectionName}`,
      is_available: isActive,
      nutritional_info: {
        ...ni,
        section_path: [newSectionName],
        sort_index: sortIndex,
        description,
      },
    })
    .eq('id', id)
    .select('id, name, nutritional_info')
    .single();

  if (error) {
    return NextResponse.json({ code: 'SECTION_UPDATE_ERROR' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;

  // Get current section info
  const { data: current, error: fetchError } = await supabase
    .from('menu_items')
    .select('id, restaurant_id, nutritional_info')
    .eq('id', id)
    .eq('nutritional_info->>is_section', 'true')
    .maybeSingle();

  if (fetchError || !current) {
    return NextResponse.json({ code: 'SECTION_NOT_FOUND' }, { status: 404 });
  }

  const ni = current.nutritional_info || {};
  const sectionName = ni.section_path?.[0];

  // Move all items in this section to "General" (no section)
  if (sectionName) {
    const { data: itemsToUpdate } = await supabase
      .from('menu_items')
      .select('id, nutritional_info')
      .eq('restaurant_id', current.restaurant_id)
      .eq('nutritional_info->>menu', ni.menu)
      .eq('nutritional_info->>section_path', JSON.stringify([sectionName]));

    if (itemsToUpdate) {
      for (const item of itemsToUpdate) {
        const itemNi = { ...item.nutritional_info };
        itemNi.section_path = []; // Move to General
        
        await supabase
          .from('menu_items')
          .update({ nutritional_info: itemNi })
          .eq('id', item.id);
      }
    }
  }

  // Delete the section placeholder item
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  
  if (error) {
    return NextResponse.json({ code: 'SECTION_DELETE_ERROR' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true });
}
