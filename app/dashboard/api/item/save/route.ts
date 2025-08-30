import { NextRequest, NextResponse } from 'next/server';
import { MenuRepository } from '@/lib/menuRepo';

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const repo = new MenuRepository('simple');
  try {
    await repo.upsertItem(payload);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
