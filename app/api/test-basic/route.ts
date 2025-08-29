import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Basic endpoint working',
    timestamp: new Date().toISOString()
  });
}
