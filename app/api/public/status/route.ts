import { NextResponse } from 'next/server';

function withCORS(req: Request, res: NextResponse) {
  const reqOrigin = req.headers.get('origin') ?? '*';
  res.headers.set('Access-Control-Allow-Origin', reqOrigin);
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Widget-Version');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return res;
}

export async function OPTIONS(req: Request) {
  return withCORS(req, new NextResponse(null, { status: 204 }));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get('restaurantId') ?? '';
    // TODO: Hook to DB/hours later. For now, never fail and default to open.
    const res = NextResponse.json(
      { open: true, restaurantId, mode: 'fallback' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
    return withCORS(req, res);
  } catch {
    // Absolutely never 500 for status
    const res = NextResponse.json({ open: true, mode: 'degraded' }, { status: 200 });
    return withCORS(req, res);
  }
}
