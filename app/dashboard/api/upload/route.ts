import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if Supabase environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `menu-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    console.log('Uploading file:', { name: file.name, size: file.size, path });

    const { data, error } = await supabase.storage.from('menu-images').upload(path, bytes, { 
      contentType: file.type 
    });
    
    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const { data: pub } = supabase.storage.from('menu-images').getPublicUrl(path);
    return NextResponse.json({ publicUrl: pub.publicUrl });
    
  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
