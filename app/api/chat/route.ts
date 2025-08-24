import { NextRequest } from 'next/server';
import { ChatRequestSchema, ChatReplySchema } from '@/lib/schemas';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { pickOrigin, withCorsHeaders, securityHeaders } from '@/lib/security';
import { isAllowedOrigin } from '@/lib/origin-allow';
import { canonicalize, sha256Base64 } from '@/lib/hash';
import { getCachedChat, setCachedChat } from '@/lib/chat-cache';
import { emitEvent } from '@/lib/events';

export const runtime = 'edge'; // fast
const VERSION = 'v1';

export async function OPTIONS(req: NextRequest) {
  const origin = pickOrigin(req);
  return new Response(null, { headers: withCorsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = pickOrigin(req);
  try {
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Bad Request' }, 400, origin);
    }
    const { restaurantId, sessionToken, message, locale } = parsed.data;

    if (!(await isAllowedOrigin(restaurantId, origin))) {
      return json({ error: 'Forbidden' }, 403, origin);
    }

    const supabase = getSupabaseServer();

    // ensure session
    await supabase.from('widget_sessions')
      .upsert({
        restaurant_id: restaurantId,
        session_token: sessionToken,
        user_agent: req.headers.get('user-agent') || null,
      }, { onConflict: 'restaurant_id,session_token' });

    // load menu + hash
    const menuRes = await fetch(`${new URL(req.url).origin}/api/public/menu?restaurantId=${restaurantId}`, {
      headers: { 'X-Widget-Version': req.headers.get('X-Widget-Version') || 'unknown' },
      cache: 'no-store',
    });
    if (!menuRes.ok) return json({ error: 'Menu unavailable' }, 502, origin);
    const menu = await menuRes.json();
    const menuStr = canonicalize(menu.sections || []);
    const menuHash = await sha256Base64(menuStr);

    // cache key
    const normalized = message.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200);
    const cacheKey = await sha256Base64([VERSION, restaurantId, normalized, menuHash, locale || ''].join('|'));

    // try cache
    const cached = await getCachedChat(restaurantId, cacheKey);
    if (cached) {
      await persistUserAssistant(supabase, restaurantId, sessionToken, locale, message, cached.reply, cached.cards);
      await emitEvent(restaurantId, 'chat', { sessionToken, cache: 'hit' });
      return json({ ...cached }, 200, origin);
    }

    // *** Your existing deterministic or LLM logic here ***
    // For now: minimal deterministic fallback using menu only
    const allItems = (menu.sections || []).flatMap((s: any) => s.items || []);
    const picks = allItems.slice(0, 3);
    const reply = {
      reply: {
        text: 'Here are a few picks from our menu. Want vegetarian or spicy?',
        context: 'We base answers on the current menu.',
        chips: ['Filter vegetarian', 'Show spicy', 'Budget options'],
        locale: locale || 'en',
      },
      cards: picks,
    };

    // validate reply shape
    const safe = ChatReplySchema.parse(reply);

    // persist
    await persistUserAssistant(supabase, restaurantId, sessionToken, locale, message, safe.reply, safe.cards);
    await setCachedChat(restaurantId, cacheKey, safe.reply, safe.cards, menuHash);
    await emitEvent(restaurantId, 'chat', { sessionToken, cache: 'miss' });

    return json(safe, 200, origin);
  } catch (e) {
    return json({ error: 'Server error' }, 500, pickOrigin(req));
  }
}

async function persistUserAssistant(
  supabase: ReturnType<typeof getSupabaseServer>,
  restaurantId: string,
  sessionToken: string,
  locale: string | undefined,
  userMsg: string,
  reply: any,
  cards: any[],
) {
  // obtain session id
  const { data: sess } = await supabase
    .from('widget_sessions')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('session_token', sessionToken)
    .maybeSingle();

  const sessionId = sess?.id || null;

  await supabase.from('chat_messages').insert([
    { restaurant_id: restaurantId, widget_session_id: sessionId, role: 'user', locale, content: userMsg },
    { restaurant_id: restaurantId, widget_session_id: sessionId, role: 'assistant', locale: reply?.locale, content: reply?.text, meta: { cards } },
  ]);
}

function json(payload: any, status = 200, origin = '') {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...withCorsHeaders(origin, { 'Vary': 'Origin' }),
      ...securityHeaders(),
    },
  });
}