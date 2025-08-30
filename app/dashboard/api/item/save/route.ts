import { NextRequest, NextResponse } from 'next/server';
import { MenuRepository } from '@/lib/menuRepo';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('Menu item save request:', { payload });
    
    const repo = new MenuRepository('simple');
    await repo.upsertItem(payload);
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Menu item save error:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e.message,
      details: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 });
  }
}
