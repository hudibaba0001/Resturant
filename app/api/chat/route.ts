// ✅ Add these at the TOP so Next never tries to pre-render this route:
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { MenuRepository } from '@/lib/menuRepo';
import { jsonError } from '@/lib/errors';
import { corsHeaders } from '@/lib/cors';

// Initialize OpenAI client lazily
import { getOpenAI } from '@/lib/ai';

// ✅ Replace with a lazy factory (RLS-only, no service key):
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null; // don't throw at import time
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'api-chat' } },
  });
}

// CORS allowlist (same as menu API)
const ALLOWLIST = [
  'https://resturant.vercel.app',
  'https://resturant-two-xi.vercel.app',
];

export async function POST(req: NextRequest) {
  const startTime = performance.now();
  const origin = req.headers.get('origin') || '';
  const headers = corsHeaders(origin, ALLOWLIST);

  const supabase = getSupabase();
  if (!supabase) {
    return jsonError('ENV_MISSING_SUPABASE', 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { message, sessionId, restaurantId } = body;
    
    console.log(`Chat API: Received request with message: "${message}", restaurantId: ${restaurantId}, sessionId: ${sessionId}`);

    if (!message) {
      return NextResponse.json({
        reply: {
          text: 'Hi! Ask me about our menu, ingredients, or recommendations.',
          chips: ['Popular items', 'Vegan options', 'Spicy dishes'],
          locale: 'en'
        },
        cards: []
      }, { headers });
    }

    // Check if OpenAI is available
    try {
      getOpenAI(); // This will throw if OPENAI_API_KEY is missing
    } catch (error) {
      return NextResponse.json({
        reply: {
          text: 'I can help you find menu items! What are you looking for?',
          chips: ['Show menu', 'Popular items', 'Dietary options'],
          locale: 'en'
        },
        cards: []
      }, { headers });
    }

    // Get menu items for context using MenuRepository (architectural consistency)
    let menuContext = '';
    if (restaurantId) {
      console.log(`Chat API: Fetching menu via MenuRepository for restaurant ${restaurantId}`);
      try {
        const repo = new MenuRepository('simple');
        const menus = await repo.listMenus(restaurantId);
        
        if (menus && menus.length > 0) {
          const chosenMenuId = menus[0]?.id;
          if (chosenMenuId) {
            const sections = await repo.listSections(restaurantId, chosenMenuId);
            
            // Collect all available items across sections
            const allItems = [];
            for (const section of sections) {
              const items = await repo.listItems(restaurantId, chosenMenuId, (section as any).path || []);
              const availableItems = items.filter((i: any) => i.is_available !== false);
              allItems.push(...availableItems);
            }

            if (allItems.length > 0) {
              console.log(`Chat API: Found ${allItems.length} menu items via MenuRepository`);
              menuContext = `Available menu items:\n${allItems.slice(0, 50).map((item: any) =>
                `- ${item.name}: ${item.description || 'No description'} (${item.price_cents ? `${item.price_cents/100} ${item.currency || 'SEK'}` : 'Price not set'})${item.dietary?.length ? ` [${item.dietary.join(', ')}]` : ''}`
              ).join('\n')}`;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching menu via MenuRepository:', error);
      }
    }

    // Create AI prompt
    const systemPrompt = `You are a helpful restaurant assistant. You help customers find menu items, answer questions about ingredients, and make recommendations.

${menuContext}

Guidelines:
- Be friendly and helpful
- Only recommend items that are actually on the menu
- Mention prices when available
- Highlight dietary information (vegan, vegetarian, gluten-free, etc.)
- Keep responses concise (1-2 sentences)
- If asked about items not on the menu, politely say they're not available
- Suggest 2-3 relevant items when making recommendations

Current menu items are listed above.`;

    const userPrompt = `Customer asks: "${message}"

Please provide a helpful response based on the available menu items.`;

    // Get AI response
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0]?.message?.content || 'I can help you find something on our menu!';
    const tokens = completion.usage?.total_tokens || 0;
    const latency = Math.round(performance.now() - startTime);

    // Generate follow-up suggestions
    const suggestions = ['Popular items', 'Vegan options', 'Spicy dishes', 'Show full menu'];

    // ✅ PERSIST MESSAGES (R2 requirement)
    console.log(`Chat API: Attempting to persist messages for restaurantId: ${restaurantId}, sessionId: ${sessionId}`);
    
    if (restaurantId) {
      try {
        // Store user message
        await supabase.from('chat_messages').insert({
          restaurant_id: restaurantId,
          session_id: sessionId || null,
          role: 'user',
          content: message,
          tokens: 0, // User messages don't count against token usage
          model: null,
          created_at: new Date().toISOString(),
        });

        // Store assistant response
        await supabase.from('chat_messages').insert({
          restaurant_id: restaurantId,
          session_id: sessionId || null,
          role: 'assistant',
          content: aiResponse,
          tokens,
          model: 'gpt-4o-mini',
          created_at: new Date().toISOString(),
        });

        console.log(`[perf] chat#create ${latency}ms, ${tokens} tokens, sessionId: ${sessionId || 'null'}`);
      } catch (error) {
        console.error('Failed to persist chat messages:', error);
        // Don't fail the request - logging is sufficient for MVP
      }
    } else {
      console.warn('Chat API: No restaurantId provided, skipping message persistence');
    }

    return NextResponse.json({ 
      reply: { 
        text: aiResponse, 
        chips: suggestions, 
        locale: 'en' 
      }, 
      cards: [] 
    }, { headers });

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Fallback response
    return NextResponse.json({ 
      reply: { 
        text: 'I can help you find menu items! What are you looking for?', 
        chips: ['Show menu', 'Popular items', 'Dietary options'], 
        locale: 'en' 
      }, 
      cards: [] 
    }, { headers });
  }
}

// ✅ Add OPTIONS support for CORS preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const headers = corsHeaders(origin, ALLOWLIST);
  return new NextResponse(null, { headers });
}