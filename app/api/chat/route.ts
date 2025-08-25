import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const Body = z.object({
  restaurantId: z.string().min(1),
  sessionToken: z.string().min(1),
  message: z.string().min(1).max(1000),
});

export async function POST(req: Request) {
  try {
    const { restaurantId, message } = Body.parse(await req.json());
    const origin = new URL(req.url).origin;

    // Try to fetch menu; swallow errors so chat still replies
    let items: any[] = [];
    try {
      const r = await fetch(`${origin}/api/public/menu?restaurantId=${encodeURIComponent(restaurantId)}`, {
        cache: 'no-store',
      });
      if (r.ok) {
        const j = await r.json();
        items = Array.isArray(j?.sections) ? j.sections.flatMap((s: any) => s?.items ?? []) : [];
      }
    } catch {}

    const q = message.toLowerCase();
    const has = (i: any, k: string) =>
      String(i?.name || '').toLowerCase().includes(k) || String(i?.description || '').toLowerCase().includes(k);
    const pick = (keys: string[]) => items.filter((i) => keys.some((k) => has(i, k))).slice(0, 3);

    let cards =
      q.includes('italian') || q.includes('pizza') || q.includes('pasta')
        ? pick(['italian', 'pizza', 'pasta', 'risotto'])
        : q.includes('vegan')
        ? pick(['vegan'])
        : q.includes('spicy')
        ? pick(['spicy', 'chili'])
        : q.includes('gluten')
        ? pick(['gluten'])
        : items.slice(0, 3);

    cards = cards.slice(0, 3);

    const reply = {
      text: concise(
        q.includes('italian')
          ? 'Here are a few Italian picks we serve. Looking for vegetarian or spicy?'
          : q.includes('vegan')
          ? (cards.length
              ? `Found ${cards.length} vegan options. Need vegetarian alternatives?`
              : 'No marked vegan items; many vegetarian dishes can be made vegan.')
          : q.includes('spicy')
          ? (cards.length
              ? `Found ${cards.length} spicy dishes. Need milder options?`
              : 'Many mains can be made spicy. Want to see those?')
          : 'Here are a few picks we serve. Want vegetarian, spicy, or budget?',
      ),
      context: q.includes('italian')
        ? 'Italian dishes focus on few, high-quality ingredients.'
        : q.includes('vegan')
        ? 'Typical swaps: tofu for paneer, olive oil for butter.'
        : undefined,
      chips: q.includes('italian')
        ? ['Filter vegetarian', 'Show spicy', 'Compare two dishes']
        : ['Show vegetarian', 'Budget options', 'Popular items'],
      locale: 'en',
    };

    return NextResponse.json({ reply, cards }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    const status = err?.name === 'ZodError' ? 400 : 500;
    console.error('CHAT_API_ERROR', err?.message);
    return NextResponse.json(
      {
        reply: {
          text: 'I had trouble fetching data, but you can browse the menu below.',
          chips: ['Popular items', 'Budget options'],
          locale: 'en',
        },
        cards: [],
      },
      { status },
    );
  }
}

function concise(s: string) {
  return s.trim().slice(0, 450);
}