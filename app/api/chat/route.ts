import { NextResponse } from 'next/server';
import { z } from 'zod';

const Body = z.object({
  restaurantId: z.string().min(1),
  sessionToken: z.string().min(1),
  message: z.string().min(1).max(1000),
});

export async function POST(req: Request) {
  try {
    const { restaurantId, sessionToken, message } = Body.parse(await req.json());

    // Get menu for basic suggestions
    const menuUrl = new URL(`/api/public/menu?restaurantId=${restaurantId}`, req.url);
    const res = await fetch(menuUrl.toString());
    const ok = res.ok ? await res.json() : { sections: [] };
    const items = Array.isArray(ok?.sections) ? ok.sections.flatMap((s: any) => s?.items ?? []) : [];

    const q = message.toLowerCase();
    const by = (k: string) => (i: any) =>
      (i?.name || '').toLowerCase().includes(k) || (i?.description || '').toLowerCase().includes(k);

    let cards = items.filter(by('italian') || by('pizza') || by('pasta'));
    if (q.includes('vegan')) cards = items.filter(by('vegan'));
    if (q.includes('spicy')) cards = items.filter(by('spicy'));
    if (q.includes('gluten')) cards = items.filter(by('gluten'));
    if (!cards.length) cards = items.slice(0, 3);
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

    return NextResponse.json({ reply, cards }, { status: 200 });
  } catch (err: any) {
    const status = err?.name === 'ZodError' ? 400 : 500;
    console.error('CHAT_API_ERROR', err?.message);
    return NextResponse.json({ error: 'chat_failed' }, { status });
  }
}

function concise(s: string) {
  return s.trim().slice(0, 450);
}