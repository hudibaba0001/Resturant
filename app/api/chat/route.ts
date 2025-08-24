// Node runtime (Supabase admin, OpenAI)
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';

// CORS headers for widget
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // TODO: Tighten to allowlist for production
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Widget-Version',
  'Vary': 'Origin',
};

// Simple in-memory rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / windowMs)}`;
  
  const current = rateLimitStore.get(key);
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

// Types matching the widget contract
export type ChatReply = {
  text: string;            // ≤ 300–450 chars, user language
  context?: string;        // optional 1-liner "typically/usually…"
  chips?: string[];        // 0–4 CTA chips
  locale?: string;         // e.g. "sv", "en", "hi"
};

export type ChatCard = {
  id: string;
  name: string;            // never translated
  desc?: string;           // translated
  price_cents: number;
  currency: string;        // "SEK"
  tags?: string[];         // allergens/dietary from DB only
};

export type ChatResponse = {
  reply: ChatReply;
  cards: ChatCard[];       // exactly 3 when possible
};

// Input validation
const ChatRequestSchema = z.object({
  restaurantId: z.string().uuid(),
  sessionToken: z.string().min(1),
  message: z.string().min(1).max(500),
});

// Helper functions for deterministic ranking
function hasTag(item: any, tag: string): boolean {
  // Check both allergens and tags arrays
  const allergens = item.allergens || [];
  const tags = item.tags || [];
  
  return [...allergens, ...tags].some((a: string) => 
    a.toLowerCase().includes(tag.toLowerCase())
  );
}

function isVegetarian(item: any): boolean {
  return hasTag(item, 'vegetarian') || 
         item.category === 'Appetizers' ||
         item.category === 'Desserts' ||
         item.name.toLowerCase().includes('paneer') ||
         item.name.toLowerCase().includes('dal') ||
         item.name.toLowerCase().includes('hummus') ||
         item.name.toLowerCase().includes('bruschetta');
}

function isSpicy(item: any): boolean {
  return item.description?.toLowerCase().includes('spicy') ||
         item.description?.toLowerCase().includes('chili') ||
         item.name.toLowerCase().includes('spicy') ||
         false;
}

function matchesCuisine(item: any, query: string): boolean {
  const cuisineKeywords = {
    italian: ['pizza', 'pasta', 'risotto', 'bruschetta', 'italian'],
    indian: ['curry', 'tikka', 'biryani', 'naan', 'dal', 'paneer', 'indian'],
    mexican: ['taco', 'burrito', 'quesadilla', 'guacamole', 'mexican'],
    chinese: ['noodle', 'rice', 'stir fry', 'dumpling', 'chinese'],
    asian: ['noodle', 'rice', 'asian']
  };

  for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
    if (keywords.some(keyword => query.includes(keyword))) {
      return item.description?.toLowerCase().includes(cuisine) ||
             keywords.some(keyword => 
               item.name.toLowerCase().includes(keyword) ||
               item.description?.toLowerCase().includes(keyword)
             );
    }
  }
  return false;
}

function toChatCard(item: any, locale: string): ChatCard {
  return {
    id: item.id,
    name: item.name, // Never translate dish names
    desc: item.description, // Keep as-is for now (could be translated if DB supports it)
    price_cents: item.price_cents || Math.round((item.price || 0) * 100),
    currency: 'SEK',
    tags: item.allergens || []
  };
}

function padToThree(cards: ChatCard[], allItems: any[], locale: string): ChatCard[] {
  if (cards.length >= 3) return cards;
  
  const usedIds = new Set(cards.map(c => c.id));
  const mains = allItems
    .filter(item => item.category === 'Mains' && !usedIds.has(item.id))
    .slice(0, 3 - cards.length)
    .map(item => toChatCard(item, locale));
  
  return [...cards, ...mains];
}

// Main ranking logic
function pickCards(query: string, items: any[], locale: string): ChatCard[] {
  const text = query.toLowerCase();

  // 1) Narrow by intent buckets
  const byCuisine = /italian|pizza|pasta|indian|mexican|taco|burrito|chinese|asian/.test(text);
  const veganAsk = /vegan|plant[- ]?based/.test(text);
  const vegAsk = /\bvegetarian|veg\b/.test(text);
  const glutenAsk = /gluten|celiac/.test(text);
  const spicyAsk = /spicy|hot/.test(text);
  const budgetAsk = /cheap|budget|affordable|under\s*\d+/.test(text);
  const dessertAsk = /dessert|sweet/.test(text);
  const drinkAsk = /drink|beverage|juice|soda/.test(text);
  const popularAsk = /popular|best|recommend/.test(text);

  let pool = items;

  // 2) Filter pool by intent (purely from DB fields)
  if (veganAsk) {
    // Only return items explicitly marked as vegan
    pool = items.filter(i => hasTag(i, 'vegan'));
    // If no vegan items found, return empty array (no fallback to mains)
    if (pool.length === 0) {
      return [];
    }
  } else if (vegAsk) {
    pool = items.filter(i => isVegetarian(i));
  } else if (glutenAsk) {
    pool = items.filter(i => hasTag(i, 'gluten-free'));
  } else if (dessertAsk) {
    pool = items.filter(i => i.category === 'Desserts');
  } else if (drinkAsk) {
    pool = items.filter(i => i.category === 'Drinks');
  } else if (spicyAsk) {
    pool = items.filter(i => isSpicy(i));
  } else if (budgetAsk) {
    pool = items.filter(i => (i.price_cents ?? 0) < 15000);
  } else if (popularAsk) {
    pool = items.filter(i => ['Mains', 'Appetizers'].includes(i.category));
  } else if (byCuisine) {
    pool = items.filter(i => matchesCuisine(i, text));
  }

  // 3) Score within pool (static)
  const scored = pool
    .map(i => ({
      item: i,
      score: (
        (i.category === 'Mains' ? 3 : 0) +
        (i.description ? 1 : 0)
      )
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => toChatCard(item, locale));

  // 4) Fallback: if <3, fill with mains
  return padToThree(scored, items, locale);
}

// Language detection
function detectLanguage(message: string, acceptLanguage?: string): string {
  // Simple detection - could be enhanced
  if (message.match(/[åäö]/i)) return 'sv';
  if (message.match(/[हिंदी]/)) return 'hi';
  if (acceptLanguage?.includes('sv')) return 'sv';
  if (acceptLanguage?.includes('hi')) return 'hi';
  return 'en';
}

// Generate response text based on intent
function generateResponseText(intent: string, cardsCount: number, locale: string): ChatReply {
  const responses = {
    sv: {
      italian: {
        text: "Här är några italienska rätter vi serverar. Vill du se vegetariskt eller något kryddigt?",
        context: "Italienska rätter är ofta enkla: få ingredienser, hög kvalitet.",
        chips: ["Filter vegetariskt", "Visa kryddigt", "Jämför två rätter"]
      },
      vegan: {
        text: cardsCount > 0 
          ? `Hittade ${cardsCount} veganska alternativ. Behöver du vegetariska alternativ?`
          : "Jag ser inga märkta veganska rätter, men flera vegetariska rätter kan göras veganska.",
        context: "Typiska byten: tofu istället för paneer, olivolja istället för smör.",
        chips: ["Visa vegetariskt", "Föreslå byten", "Budgetalternativ"]
      },
      vegetarian: {
        text: `Hittade ${cardsCount} vegetariska alternativ. Många kan göras veganska.`,
        chips: ["Visa veganskt", "Föreslå byten", "Budgetalternativ"]
      },
      gluten: {
        text: cardsCount > 0
          ? `Hittade ${cardsCount} glutenfria alternativ. Behöver du fler alternativ?`
          : "Inga märkta glutenfria rätter, men jag kan kolla ingredienser. Visa huvudrätter?",
        chips: ["Visa huvudrätter", "Kolla ingredienser", "Budgetalternativ"]
      },
      spicy: {
        text: cardsCount > 0
          ? `Hittade ${cardsCount} kryddiga rätter. Behöver du mildare alternativ?`
          : "Många huvudrätter kan göras kryddiga. Visa huvudrätter?",
        chips: ["Visa huvudrätter", "Specifiera hetta", "Budgetalternativ"]
      },
      budget: {
        text: `Hittade ${cardsCount} budgetvänliga alternativ under 150 SEK. Bra värde utan kompromiss.`,
        chips: ["Visa alla", "Jämför priser", "Populära rätter"]
      },
      popular: {
        text: "Här är våra mest populära rätter. Behöver du specifika rekommendationer?",
        chips: ["Visa vegetariskt", "Budgetalternativ", "Kryddiga rätter"]
      },
      default: {
        text: "Jag kan hjälpa med kostpreferenser, rekommendationer eller specifika köksstilar. Vad letar du efter?",
        chips: ["Populära rätter", "Vegetariskt", "Budgetalternativ"]
      }
    },
    en: {
      italian: {
        text: "Here are a few Italian picks we serve. Looking for vegetarian or spicy?",
        context: "Italian dishes are typically simple: few ingredients, high quality.",
        chips: ["Filter vegetarian", "Show spicy", "Compare two dishes"]
      },
      vegan: {
        text: cardsCount > 0
          ? `Found ${cardsCount} vegan options. Need vegetarian alternatives?`
          : "I don't see items marked vegan, but several vegetarian dishes can be made vegan.",
        context: "Typical swaps: tofu for paneer, olive oil for butter.",
        chips: ["Show vegetarian", "Suggest swaps", "Budget options"]
      },
      vegetarian: {
        text: `Found ${cardsCount} vegetarian options. Many can be made vegan.`,
        chips: ["Show vegan", "Suggest swaps", "Budget options"]
      },
      gluten: {
        text: cardsCount > 0
          ? `Found ${cardsCount} gluten-free options. Need more alternatives?`
          : "No marked gluten-free items, but I can check ingredients. Show main courses?",
        chips: ["Show main courses", "Check ingredients", "Budget options"]
      },
      spicy: {
        text: cardsCount > 0
          ? `Found ${cardsCount} spicy dishes. Need milder options?`
          : "Many main courses can be made spicy. Show main courses?",
        chips: ["Show main courses", "Specify heat level", "Budget options"]
      },
      budget: {
        text: `Found ${cardsCount} budget-friendly options under 150 SEK. Great value without compromise.`,
        chips: ["Show all", "Compare prices", "Popular items"]
      },
      popular: {
        text: "Here are our most popular items. Need specific recommendations?",
        chips: ["Show vegetarian", "Budget options", "Spicy dishes"]
      },
      default: {
        text: "I can help with dietary preferences, recommendations, or specific cuisines. What are you looking for?",
        chips: ["Popular items", "Vegetarian", "Budget options"]
      }
    }
  };

  const langResponses = responses[locale as keyof typeof responses] || responses.en;
  return langResponses[intent as keyof typeof langResponses] || langResponses.default;
}

// Detect intent from query
function detectIntent(query: string): string {
  const text = query.toLowerCase();
  
  if (/italian|pizza|pasta/.test(text)) return 'italian';
  if (/vegan|plant[- ]?based/.test(text)) return 'vegan';
  if (/\bvegetarian|veg\b/.test(text)) return 'vegetarian';
  if (/gluten|celiac/.test(text)) return 'gluten';
  if (/spicy|hot/.test(text)) return 'spicy';
  if (/cheap|budget|affordable|under\s*\d+/.test(text)) return 'budget';
  if (/popular|best|recommend/.test(text)) return 'popular';
  
  return 'default';
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ChatRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { restaurantId, sessionToken, message } = validation.data;
    const locale = detectLanguage(message, request.headers.get('accept-language') || undefined);

    // Rate limiting: 10 requests per 30 seconds per restaurant + session
    const rateLimitKey = `${restaurantId}:${sessionToken}`;
    if (!checkRateLimit(rateLimitKey, 10, 30000)) {
      return NextResponse.json({
        reply: {
          text: "Lots of requests—try again in a few seconds.",
          locale: 'en'
        },
        cards: []
      }, { status: 429, headers: CORS_HEADERS });
    }

    // Get menu items for this restaurant
    const supabase = getSupabaseServer();
    const { data: menuData, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true);

         if (menuError) {
       console.error('Menu fetch error:', menuError);
       return NextResponse.json({
         reply: {
           text: locale === 'sv' 
             ? "Jag kunde inte hämta menyn just nu. Du kan fortfarande bläddra i listan till vänster."
             : "I couldn't fetch the menu just now. You can still browse the list on the left.",
           locale
         },
         cards: []
       }, { headers: CORS_HEADERS });
     }

    // Detect intent and pick cards
    const intent = detectIntent(message);
    const cards = pickCards(message, menuData || [], locale);
    
    // Generate response
    const reply = generateResponseText(intent, cards.length, locale);
    reply.locale = locale;

         // Log for observability
     const startTime = Date.now();
     console.log('Chat request:', {
       tenant_id: restaurantId,
       session: sessionToken.substring(0, 8),
       intent_bucket: intent,
       cards_count: cards.length,
       locale,
       widget_version: request.headers.get('x-widget-version') || 'unknown',
       source: 'server'
     });

         const latency = Date.now() - startTime;
     console.log('Chat response:', {
       tenant_id: restaurantId,
       session: sessionToken.substring(0, 8),
       latency_ms: latency,
       cards_count: cards.length
     });
     
     return NextResponse.json({
       reply,
       cards
     }, { headers: CORS_HEADERS });

     } catch (error) {
     console.error('Chat API error:', error);
     
     // Better error responses
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
     const isNetwork = errorMessage.includes('fetch') || errorMessage.includes('network');
     
     const reply = {
       text: isRateLimit 
         ? "Lots of requests—try again in a few seconds."
         : isNetwork
         ? "Couldn't fetch the menu—browse items on the left."
         : "I'm having trouble right now. Please try again.",
       locale: 'en'
     };
     
     return NextResponse.json({
       reply,
       cards: []
     }, { status: isRateLimit ? 429 : 500, headers: CORS_HEADERS });
   }
}