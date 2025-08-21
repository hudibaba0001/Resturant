import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/onboard?error=missing_code`);

  const supabase = getSupabaseServer();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/onboard?error=${encodeURIComponent(error.message)}`
    );
  }

  // User is now authenticated (cookie set) → go to welcome/dashboard
  // The restaurant creation will be handled by the dashboard component
  return NextResponse.redirect(`${origin}/dashboard/menu?welcome=true&pending=restaurant`);
}

export async function POST(req: Request) {
  const { event, session } = await req.json().catch(() => ({}));
  const supabase = getSupabaseServer();
  
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
    await supabase.auth.setSession({ 
      access_token: session.access_token, 
      refresh_token: session?.refresh_token || '' 
    });
  }
  
  if (event === 'SIGNED_OUT') {
    await supabase.auth.signOut();
  }
  
  return NextResponse.json({ ok: true });
}
