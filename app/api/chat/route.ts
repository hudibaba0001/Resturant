export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=> ({}));
    const text = (body?.text || '').toString().slice(0, 500);
    if (!process.env.OPENAI_API_KEY) {
      const msg = text ? 'Got it! Here are some popular picks.' : 'Hi! Ask about the menu or allergens.';
      return NextResponse.json({ reply: { text: msg, chips: [], locale: 'en' }, cards: [] }, { status: 200 });
    }
    // If you wire LLM, wrap in try/catch; fallback on errors.
    return NextResponse.json({ reply: { text: 'Let me help with that. What are you in the mood for?', chips: [], locale: 'en' }, cards: [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ code: 'CHAT_THROW', error: String(e?.message || e) }, { status: 500 });
  }
}