import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Security headers
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN'); // if you embed widget cross-domain, set only on dashboard pages
  
  // Light CSP starter (tighten post-MVP)
  res.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; connect-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'");
  
  // HSTS (only if you fully serve over HTTPS and want subdomains)
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  return res;
}

export const config = { 
  matcher: ['/((?!_next|api/health).*)'] 
};
