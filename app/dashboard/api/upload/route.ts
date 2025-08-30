import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `menu-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage.from('menu-images').upload(path, bytes, { contentType: file.type });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: pub } = supabase.storage.from('menu-images').getPublicUrl(path);
  return NextResponse.json({ publicUrl: pub.publicUrl });
}
