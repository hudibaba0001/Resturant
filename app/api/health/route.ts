// Node runtime for Supabase
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check Supabase connection with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1);
    
    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database connection failed',
          error: error.message,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
        { status: 503 }
      );
    }
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      message: 'All systems operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      services: {
        database: 'connected',
        api: 'operational',
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      { status: 500 }
    );
  }
}
