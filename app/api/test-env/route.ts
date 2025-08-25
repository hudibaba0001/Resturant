import { NextResponse } from 'next/server';

// Load environment variables for API routes
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config({ path: '.env.local' });
}

export async function GET() {
  return NextResponse.json({
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}
