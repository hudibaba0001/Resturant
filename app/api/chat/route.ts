import { NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  restaurantId: z.string().min(1),
  sessionToken: z.string().min(1),
  message: z.string().min(1).max(1000),
});

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const raw = await req.json();
    const { restaurantId, sessionToken, message } = BodySchema.parse(raw);

    // Always have a fallback: fetch our own Menu API
    const menuUrl = new URL(`/api/public/menu?restaurantId=${restaurantId}`, req.url);
    const menuRes = await fetch(menuUrl, { headers: { 'X-Internal': 'chat' } });
    if (!menuRes.ok) {
      console.error('Menu API failed', await safeText(menuRes));
      return NextResponse.json({ error: 'menu_unavailable' }, { status: 502 });
    }
    const menu = await menuRes.json();
    const items = Array.isArray(menu?.sections)
      ? menu.sections.flatMap((s: any) => s?.items ?? [])
      : [];

    // Simple heuristic cards (max 3)
    const q = message.toLowerCase();
    const byIncl = (k: string) => (i: any) =>
      (i?.name || '').toLowerCase().includes(k) ||
      (i?.description || '').toLowerCase().includes(k);

    let cards = items.filter(
      byIncl('italian') || byIncl('pizza') || byIncl('pasta'),
    );
    if (q.includes('vegan')) cards = items.filter(byIncl('vegan'));
    if (q.includes('spicy')) cards = items.filter(byIncl('spicy'));
    if (q.includes('gluten')) cards = items.filter(byIncl('gluten'));

    cards = (cards.length ? cards : items).slice(0, 3);

    // Concise reply contract
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
          : 'Here are a few picks we serve. Want vegetarian, spicy, or budget?'
      ),
      context:
        q.includes('italian')
          ? 'Italian dishes focus on few, high-quality ingredients.'
          : q.includes('vegan')
          ? 'Typical swaps: tofu for paneer, olive oil for butter.'
          : undefined,
      chips: q.includes('italian')
        ? ['Filter vegetarian', 'Show spicy', 'Compare two dishes']
        : ['Show vegetarian', 'Budget options', 'Popular items'],
      locale: 'en',
    };

    const res = NextResponse.json({ reply, cards }, { status: 200 });
    res.headers.set('X-Widget-Version', '1.0.0');
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err: any) {
    console.error('CHAT_API_ERROR', err?.message, err?.stack);
    const status = err?.name === 'ZodError' ? 400 : 500;
    return NextResponse.json({ error: 'chat_internal_error' }, { status });
  } finally {
    console.log('chat_latency_ms', Date.now() - t0);
  }
}

async function safeText(r: Response) {
  try { return await r.text(); } catch { return '<no-body>'; }
}
function concise(s: string) { return s.trim().slice(0, 450); }