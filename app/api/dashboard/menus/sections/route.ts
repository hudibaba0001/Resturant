export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // service role is required because this runs server-side for the dashboard
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Accept both camelCase and snake_case from the UI
const BodySchema = z.object({
  menuId: z.string().uuid().optional(),
  menu_id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(120),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64);

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
    const menu_id = (parsed.data.menuId ?? parsed.data.menu_id)!;

    // Insert new section (adjust the columns to match your schema)
    const insertRow: Record<string, any> = {
      restaurant_id: menu_id, // menu_sections uses restaurant_id, not menu_id
      name,
      position: 0,                  // optional default
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
