import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.object({
  restaurantId: z.string().min(1),
  sessionToken: z.string().min(1),
  message: z.string().min(1).max(500),
});

function withCORS(res: NextResponse, origin: string) {
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Widget-Version');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return res;
}

export async function OPTIONS(req: Request) {
  const origin = new URL(req.url).origin;
  return withCORS(new NextResponse(null, { status: 204 }), origin);
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;

  // 1) Parse body safely
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return withCORS(
      NextResponse.json({ error: 'Bad request' }, { status: 400 }),
      origin
    );
  }

  // 2) Try to load menu, but NEVER fail if it's unavailable
  let items: any[] = [];
  try {
    const r = await fetch(
      `${origin}/api/public/menu?restaurantId=${encodeURIComponent(body.restaurantId)}`,
      { cache: 'no-store' }
    );
    if (r.ok) {
      const j = await r.json();
      const sections = Array.isArray(j.sections) ? j.sections : [];
      items = sections.flatMap((s: any) => s?.items || []);
    }
  } catch {
    // swallow – we still reply
  }

  // 3) Tiny, deterministic reply builder (no LLM, no env)
  const q = body.message.toLowerCase();
  const pick = (pred: (i: any) => boolean) =>
    items
      .filter(pred)
      .slice(0, 3)
      .map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description || '',
        price_cents: i.price_cents ?? Math.round((i.price || 0) * 100),
        currency: i.currency || 'SEK',
        allergens: i.allergens || [],
      }));

  let cards: any[] = [];
  let text = 'Here are a few picks. Want vegetarian, spicy, or budget?';
  let context = '';
  let chips = ['Show vegetarian', 'Spicy dishes', 'Budget options'];

  if (/italian|pizza|pasta|risotto|bruschetta/.test(q)) {
    cards = pick((i) =>
      /pizza|pasta|risotto|bruschetta|italian/i.test(
        `${i.name} ${i.description || ''}`
      )
    );
    text = 'Here are a few Italian picks we serve. Looking for vegetarian or spicy?';
    context = 'Italian dishes are typically simple: few ingredients, high quality.';
  } else if (/vegan|plant/.test(q)) {
    const vegan = pick(
      (i) =>
        (i.allergens || []).some((t: string) => /vegan/i.test(t)) ||
        /vegan/i.test(i.description || '')
    );
    if (vegan.length) {
      cards = vegan;
      text = `Found ${vegan.length} vegan options. Need vegetarian alternatives?`;
      context = 'Typical swaps: tofu for paneer, olive oil for butter.';
      chips = ['Show vegetarian', 'Suggest swaps', 'Budget options'];
    } else {
      text =
        "I don't see items marked vegan, but several vegetarian dishes can be made vegan.";
      context = 'Typical swaps: tofu for paneer, olive oil for butter.';
      cards = [];
      chips = ['Show vegetarian', 'Suggest swaps', 'Budget options'];
    }
  } else if (/popular|recommend|best/.test(q)) {
    cards = pick((i) => ['Mains', 'Appetizers'].includes(i.category));
    text = 'Here are our most popular items. Need specific recommendations?';
  } else if (items.length) {
    cards = pick(() => true);
  }

  const reply = { text, context, chips, locale: 'en' };
  return withCORS(NextResponse.json({ reply, cards }, { status: 200 }), origin);
}