export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  const supabase = getSupabaseServer();

  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr) return NextResponse.json({ ok:false, stage:'getUser', error: uErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ ok:false, stage:'getUser', error: 'no user' }, { status: 401 });

  const owned = await supabase.from('restaurants').select('id,name').eq('owner_id', user.id).limit(2);
  const staff = await supabase.from('restaurant_staff').select('restaurant_id,role').eq('user_id', user.id).limit(2);

  return NextResponse.json({
    ok:true,
    user: { id: user.id, email: user.email },
    owned: owned.data, ownedErr: owned.error?.message,
    staff: staff.data, staffErr: staff.error?.message
  });
}
