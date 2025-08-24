import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const config = { matcher: ['/dashboard/:path*'] }; // not /login, not /auth/callback

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => req.cookies.get(n)?.value,
        set: (n, v, o) => {
          res.cookies.set({ name: n, value: v, ...o });
        },
        remove: (n, o) => {
          res.cookies.set({ name: n, value: '', ...o, maxAge: 0 });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return res; // return the SAME res you mutated
}
