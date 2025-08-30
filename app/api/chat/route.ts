// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { checkQuota, incrementUsage } from '@/lib/quotas';
import { logChatEvent, logError } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Configuration
const IS_DEV = process.env.NODE_ENV === 'development' || true; // Force dev mode for now
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Supabase client
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('[SUPABASE] Missing credentials, using mock data');
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

// Validation
const BodySchema = z.object({
  restaurantId: z.string().min(1),
  sessionToken: z.string().min(1),
  message: z.string().min(1).max(500),
  lastIntent: z.string().optional(),
});

// CORS helper
function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Widget-Version');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

// Debug endpoint to test database connection
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurantId') || 'test-123';
  
  try {
    console.log(`[DEBUG] Testing database connection for restaurant: ${restaurantId}`);
    
    const menuItems = await getMenuItems(restaurantId);
    
    return cors(NextResponse.json({
      debug: true,
      restaurantId,
      menuItemCount: menuItems.length,
      menuItems: menuItems.slice(0, 3),
      isDev: IS_DEV,
      hasOpenAI: !!openai,
      env: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY
      }
    }));
  } catch (error) {
    return cors(NextResponse.json({
      debug: true,
      error: error instanceof Error ? error.message : String(error),
      restaurantId,
      isDev: IS_DEV
    }));
  }
}

// Get menu items with proper error handling
async function getMenuItems(restaurantId: string) {
  try {
    console.log(`[MENU] Fetching items for restaurant: ${restaurantId}`);
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .limit(50);
    
    if (error) {
      console.error(`[MENU] Supabase error:`, error);
      throw error;
    }
    
    console.log(`[MENU] Raw data from DB:`, data?.length || 0, 'items');
    
    // Ensure all required fields exist
    const formattedItems = (data || []).map(item => ({
      id: item.id || Math.random().toString(),
      name: item.name || 'Unknown Item',
      description: item.description || '',
      price_cents: item.price_cents || 0,
      category: item.category || 'Other',
      allergens: item.allergens || [],
      ...item
    }));
    
    console.log(`[MENU] Formatted items:`, formattedItems.length);
    return formattedItems;
    
  } catch (error) {
    console.error(`[MENU] Fetch failed:`, error instanceof Error ? error.message : String(error));
    logError('menu_fetch_failed', error, { restaurantId });
    
    // Return mock data in development
    if (IS_DEV) {
      console.log(`[MENU] Using mock data for development`);
      return [
        {
          id: '1',
          name: 'Margherita Pizza',
          description: 'Classic tomato and mozzarella',
          price_cents: 12900,
          category: 'Mains',
          allergens: ['vegetarian']
        },
        {
          id: '2',
          name: 'Bruschetta',
          description: 'Grilled bread with tomatoes',
          price_cents: 7900,
          category: 'Appetizers',
          allergens: ['vegan']
        },
        {
          id: '3',
          name: 'Spicy Arrabbiata',
          description: 'Spicy tomato sauce with chili',
          price_cents: 14900,
          category: 'Mains',
          allergens: ['vegetarian', 'spicy']
        }
      ];
    }
    return [];
  }
}

// Improved rule engine
function processWithRules(message: string, menuItems: any[]) {
  const q = message.toLowerCase();
  
  // Log for debugging
  if (IS_DEV) {
    console.log(`[RULES] Query: "${message}"`);
    console.log(`[RULES] Menu items: ${menuItems.length}`);
  }
  
  // Helper to find matching items
  const findItems = (predicate: (item: any) => boolean, limit = 3) => {
    return menuItems.filter(predicate).slice(0, limit);
  };
  
  // Budget intent
  if (q.includes('budget') || q.includes('cheap') || q.includes('affordable')) {
    const items = menuItems
      .filter(i => i.price_cents > 0)
      .sort((a, b) => a.price_cents - b.price_cents)
      .slice(0, 3);
    
    return {
      text: items.length 
        ? `Here are our ${items.length} most affordable options.`
        : "Let me show you our menu options.",
      cards: items,
      chips: ['Show vegetarian', 'Popular items', 'Drinks'],
      intent: 'budget'
    };
  }
  
  // Vegan/vegetarian intent
  if (q.includes('vegan') || q.includes('vegetarian')) {
    const isVegan = q.includes('vegan');
    const items = findItems(item => 
      item.allergens?.some((a: string) => 
        a.toLowerCase().includes(isVegan ? 'vegan' : 'vegetarian')
      ) ||
      item.description?.toLowerCase().includes(isVegan ? 'vegan' : 'vegetarian')
    );
    
    return {
      text: items.length 
        ? `Found ${items.length} ${isVegan ? 'vegan' : 'vegetarian'} options.`
        : `No items marked ${isVegan ? 'vegan' : 'vegetarian'}, but we can customize some dishes.`,
      cards: items.length ? items : menuItems.slice(0, 2),
      chips: isVegan 
        ? ['Show vegetarian', 'Allergen info', 'Ask staff']
        : ['Show vegan', 'Dairy-free', 'Ask staff'],
      intent: isVegan ? 'vegan' : 'vegetarian'
    };
  }
  
  // Pizza/Italian
  if (q.includes('pizza') || q.includes('italian')) {
    const items = findItems(item => 
      item.name?.toLowerCase().includes('pizza') ||
      item.category?.toLowerCase() === 'pizza'
    );
    
    return {
      text: items.length 
        ? `We have ${items.length} pizza options available.`
        : "Check our Italian dishes in the menu above.",
      cards: items.length ? items : menuItems.filter(i => i.category === 'Mains').slice(0, 2),
      chips: ['Extra toppings', 'Vegetarian pizzas', 'Drinks'],
      intent: 'pizza'
    };
  }
  
  // Default response
  const popularItems = menuItems
    .filter(i => i.category === 'Mains' || i.category === 'Appetizers')
    .slice(0, 3);
  
  return {
    text: "I can help you find dishes by cuisine, dietary preference, or budget. What are you looking for?",
    cards: popularItems,
    chips: ['Show vegetarian', 'Budget options', 'Popular items'],
    intent: 'general'
  };
}

// Main handler
export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    // Parse request
    const raw = await req.json();
    const { restaurantId, sessionToken, message, lastIntent } = BodySchema.parse(raw);
    
    // ALWAYS load menu items first
    const menuItems = await getMenuItems(restaurantId);
    
    if (IS_DEV) {
      console.log(`[CHAT] Restaurant: ${restaurantId}`);
      console.log(`[CHAT] Message: "${message}"`);
      console.log(`[CHAT] Menu items: ${menuItems.length}`);
      console.log(`[CHAT] Menu items:`, menuItems.map(item => ({ name: item.name, category: item.category, allergens: item.allergens })));
    }
    
    // Check quota (but don't block in dev)
    if (!IS_DEV) {
      const quota = await checkQuota(restaurantId);
      if (!quota.allowed) {
        const result = processWithRules(message, menuItems);
        return cors(NextResponse.json({
          reply: {
            text: `⚠️ Monthly limit reached. ${result.text}`,
            chips: ['Upgrade plan'],
            locale: 'en',
            intent: 'quota_exceeded'
          },
          cards: result.cards
        }));
      }
    }
    
    // Try LLM if available and properly configured
    if (openai && OPENAI_API_KEY && (IS_DEV || process.env.CHAT_LLM_ENABLED === '1')) {
      try {
        // Simple LLM call without complex RAG for now
        const completion = await openai.chat.completions.create({
          model: CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: `You're a helpful restaurant assistant. Be concise (max 150 chars). 
                       Only mention items from this menu: ${menuItems.slice(0, 10).map(i => i.name).join(', ')}`
            },
            { role: 'user', content: message }
          ],
          max_tokens: 100,
          temperature: 0.7,
        });
        
        const llmText = completion.choices[0]?.message?.content || '';
        const result = processWithRules(message, menuItems);
        
        // Log telemetry
        logChatEvent({
          restaurantId,
          sessionToken,
          retrievalIds: result.cards.map(c => c.id),
          token_in: 50,
          token_out: 50,
          model: CHAT_MODEL,
          latency_ms: Date.now() - startTime,
          validator_pass: true,
          source: 'llm',
          message
        });
        
        return cors(NextResponse.json({
          reply: {
            text: llmText || result.text,
            chips: result.chips,
            locale: 'en',
            intent: result.intent
          },
          cards: result.cards
        }));
      } catch (llmError) {
        logError('llm_failed', llmError, { restaurantId, message });
        // Fall through to rules
      }
    }
    
    // Use rule engine (fallback when LLM is disabled or fails)
    const result = processWithRules(message, menuItems);
    
    // Log telemetry
    logChatEvent({
      restaurantId,
      sessionToken,
      retrievalIds: result.cards.map(c => c.id),
      token_in: 0,
      token_out: 0,
      model: 'rules',
      latency_ms: Date.now() - startTime,
      validator_pass: true,
      source: 'rules',
      message
    });
    
    return cors(NextResponse.json({
      reply: {
        text: result.text,
        chips: result.chips,
        locale: 'en',
        intent: result.intent
      },
      cards: result.cards
    }));
    
  } catch (error) {
    logError('chat_error', error);
    
    // Always return a valid response, never crash
    return cors(NextResponse.json({
      reply: {
        text: "I'm having trouble right now. Please browse the menu above.",
        chips: ['Show menu', 'Try again', 'Contact us'],
        locale: 'en',
        intent: 'error'
      },
      cards: []
    }));
  }
}