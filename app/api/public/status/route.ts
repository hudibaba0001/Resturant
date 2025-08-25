import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get('restaurantId') ?? '';
    // TODO: Hook to DB/hours later. For now, never fail and default to open.
    return NextResponse.json(
      { open: true, restaurantId, mode: 'fallback' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    // Absolutely never 500 for status
    return NextResponse.json({ open: true, mode: 'degraded' }, { status: 200 });
  }
}
