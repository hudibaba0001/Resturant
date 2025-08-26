// app/api/chat/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ChatBody = {
  restaurantId?: string;
  sessionToken?: string;
  message?: string;
};

function cors(res: NextResponse, origin: string) {
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Widget-Version');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return res;
}

export async function OPTIONS(req: Request) {
  const origin = new URL(req.url).origin;
  return cors(new NextResponse(null, { status: 204 }), origin);
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return cors(
      NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }),
      origin,
    );
  }

  const restaurantId = body.restaurantId?.trim();
  const sessionToken = body.sessionToken?.trim();
  const message = body.message?.trim();

  if (!restaurantId || !sessionToken || !message) {
    return cors(
      NextResponse.json({ error: 'restaurantId, sessionToken and message are required' }, { status: 400 }),
      origin,
    );
  }
  if (message.length > 500) {
    return cors(
      NextResponse.json({ error: 'message too long' }, { status: 400 }),
      origin,
    );
  }

  // Try to fetch menu (optional)
  let sections: any[] = [];
  try {
    const r = await fetch(`${origin}/api/public/menu?restaurantId=${encodeURIComponent(restaurantId)}`, {
      headers: { 'X-Widget-Version': req.headers.get('x-widget-version') ?? 'unknown' },
      cache: 'no-store',
    });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j?.sections)) sections = j.sections;
    }
  } catch {
    // swallow — chat still replies without menu
  }

  const allItems = sections.flatMap((s: any) => s?.items || []);
  const q = message.toLowerCase();

  function pick3(items: any[]) {
    return items.slice(0, 3).map((i) => ({
      id: String(i.id ?? ''),
      name: String(i.name ?? 'Item'),
      description: i.description ? String(i.description) : '',
      price_cents: Number.isFinite(i.price_cents) ? i.price_cents : Math.round((i.price || 0) * 100),
      currency: String(i.currency || 'SEK'),
      allergens: Array.isArray(i.allergens) ? i.allergens : [],
      category: String(i.category || ''),
    }));
  }

  let text = "I can help with cuisines, dietary needs, or budget. What are you looking for?";
  let context = "";
  let chips: string[] = ["Show vegetarian", "Spicy dishes", "Budget options"];
  let cards: any[] = [];

  // Simple intent routing
  const inDescName = (item: any, needles: string[]) =>
    needles.some((n) => (item.name || "").toLowerCase().includes(n) || (item.description || "").toLowerCase().includes(n));

  if (/(italian|pizza|pasta|risotto|bruschetta)/.test(q)) {
    const items = allItems.filter((i: any) =>
      inDescName(i, ['italian', 'pizza', 'pasta', 'risotto', 'bruschetta'])
    );
    if (items.length) {
      text = "Here are a few Italian picks we serve. Looking for vegetarian or spicy?";
      context = "Italian dishes focus on a few high-quality ingredients.";
      chips = ["Filter vegetarian", "Show spicy", "Compare two dishes"];
      cards = pick3(items);
    }
  } else if (/(vegan|plant)/.test(q)) {
    const items = allItems.filter((i: any) =>
      (i.allergens || []).some((a: string) => String(a).toLowerCase() === 'vegan') ||
      String(i.description || '').toLowerCase().includes('vegan')
    );
    if (items.length) {
      text = `Found ${items.length} vegan options. Need vegetarian alternatives?`;
      context = "Typical swaps: tofu for paneer, olive oil for butter.";
      chips = ["Show vegetarian", "Suggest swaps", "Budget options"];
      cards = pick3(items);
    } else {
      text = "I don't see items marked vegan, but several vegetarian dishes can be made vegan.";
      context = "Typical swaps: tofu for paneer, olive oil for butter.";
      chips = ["Show vegetarian", "Suggest swaps", "Budget options"];
      cards = [];
    }
  } else if (/(popular|recommend|best)/.test(q)) {
    const items = allItems.filter((i: any) => ['Mains', 'Appetizers'].includes(i.category));
    text = "Here are our most popular items. Need specific recommendations?";
    chips = ["Show vegetarian", "Budget options", "Spicy dishes"];
    cards = pick3(items);
  }

  const reply = {
    text,
    context: context || undefined,
    chips,
    locale: 'en',
  };

  return cors(
    NextResponse.json({ reply, cards }, { status: 200 }),
    origin,
  );
}