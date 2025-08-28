import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setRequestId } from '@/lib/log';

export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  // Set request ID for logging
  setRequestId(requestId);
  
  // Add request ID to response headers for tracing
  const response = NextResponse.next();
  response.headers.set('x-request-id', requestId);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
