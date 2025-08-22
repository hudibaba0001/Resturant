export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  const supabase = getSupabaseServer();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  return NextResponse.json({ 
    auth: !!user,
    userId: user?.id,
    email: user?.email,
    error: error?.message
  });
}
