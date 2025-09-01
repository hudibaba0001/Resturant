export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

const UpdateSectionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  sortIndex: z.number().int().optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const sb = await getSupabaseServer();
  const id = ctx.params.id;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSectionSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });
  }

  // Get current section data
  const { data: current } = await sb
    .from('menu_items')
    .select('nutritional_info, restaurant_id')
    .eq('id', id)
    .eq('nutritional_info->>is_section', 'true')
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ code: 'SECTION_NOT_FOUND' }, { status: 404 });
  }

  const ni = current.nutritional_info || {};
  const oldSectionName = ni.section_path?.[0];
  const newSectionName = parsed.data.name || oldSectionName;

  // If section name is changing, we need to update all items in that section
  if (parsed.data.name && parsed.data.name !== oldSectionName) {
    // Update all items in the old section to use the new section name
    const { error: updateError } = await sb
      .from('menu_items')
      .update({
        nutritional_info: sb.sql`jsonb_set(nutritional_info, '{section_path}', '["${newSectionName}"]'::jsonb)`
      })
      .eq('restaurant_id', current.restaurant_id)
      .eq('nutritional_info->>menu', ni.menu)
      .eq('nutritional_info->>section_path', JSON.stringify([oldSectionName]));

    if (updateError) {
      console.log("Section rename error:", updateError);
      return NextResponse.json({ code: 'SECTION_UPDATE_ERROR' }, { status: 500 });
    }
  }

  // Update the section placeholder item
  const updateData: any = {};
  if (parsed.data.name) updateData.name = `[SECTION] ${parsed.data.name}`;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.isActive !== undefined) updateData.is_available = parsed.data.isActive;

  // Update nutritional_info
  const newNutritionalInfo = { ...ni };
  if (parsed.data.name) newNutritionalInfo.section_path = [parsed.data.name];
  if (parsed.data.description !== undefined) newNutritionalInfo.description = parsed.data.description;
  if (parsed.data.isActive !== undefined) newNutritionalInfo.is_active = parsed.data.isActive;
  if (parsed.data.sortIndex !== undefined) newNutritionalInfo.sort_index = parsed.data.sortIndex;

  updateData.nutritional_info = newNutritionalInfo;

  const { data, error } = await sb
    .from('menu_items')
    .update(updateData)
    .eq('id', id)
    .select('id, name, nutritional_info')
    .single();

  if (error) {
    return NextResponse.json({ code: 'SECTION_UPDATE_ERROR' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const sb = await getSupabaseServer();
  const id = ctx.params.id;

  // Get section info before deleting
  const { data: section } = await sb
    .from('menu_items')
    .select('nutritional_info, restaurant_id')
    .eq('id', id)
    .eq('nutritional_info->>is_section', 'true')
    .maybeSingle();

  if (!section) {
    return NextResponse.json({ code: 'SECTION_NOT_FOUND' }, { status: 404 });
  }

  const ni = section.nutritional_info || {};
  const sectionName = ni.section_path?.[0];

  // Move all items in this section to "General" (no section)
  if (sectionName) {
    const { error: moveError } = await sb
      .from('menu_items')
      .update({
        nutritional_info: sb.sql`jsonb_set(nutritional_info, '{section_path}', '[]'::jsonb)`
      })
      .eq('restaurant_id', section.restaurant_id)
      .eq('nutritional_info->>menu', ni.menu)
      .eq('nutritional_info->>section_path', JSON.stringify([sectionName]))
      .neq('nutritional_info->>is_section', 'true');

    if (moveError) {
      console.log("Section deletion error (moving items):", moveError);
      return NextResponse.json({ code: 'SECTION_DELETE_ERROR' }, { status: 500 });
    }
  }

  // Delete the section placeholder item
  const { error } = await sb
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ code: 'SECTION_DELETE_ERROR' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true });
}
