// Edge runtime (no Node-only libs)
export const runtime = 'edge';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
