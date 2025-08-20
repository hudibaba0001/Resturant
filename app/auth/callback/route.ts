import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/onboard?error=missing_code`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );

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
