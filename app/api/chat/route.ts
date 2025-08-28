// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { checkQuota, incrementUsage } from '@/lib/quotas';
import { logChatEvent, logError } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Configuration with safe defaults
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_LLM_ENABLED = process.env.CHAT_LLM_ENABLED === '1';
const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';
const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small';
const RAG_TOP_K = parseInt(process.env.RAG_TOP_K || '6');
const RAG_SIM_THRESHOLD = parseFloat(process.env.RAG_SIM_THRESHOLD || '0.72');
const LLM_TOKEN_BUDGET = parseInt(process.env.LLM_TOKEN_BUDGET || '1200');

// Pilot restaurant IDs (only these get LLM access)
const PILOT_RESTAURANTS = [
  '64806e5b-714f-4388-a092-29feff9b64c0', // Your pilot restaurant
  // Add more pilot restaurant IDs here
];

// Safety check: is this restaurant allowed to use LLM?
function isPilotRestaurant(restaurantId: string): boolean {
  return PILOT_RESTAURANTS.includes(restaurantId);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Lazy initialization of Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Validation schema
const BodySchema = z.object({
  restaurantId: z.string().min(1),
  sessionToken: z.string().min(1),
  message: z.string().min(1).max(500),
  lastIntent: z.string().optional(),
});

// CORS helper
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

// Retrieval function
async function retrieveRelevantItems(restaurantId: string, query: string): Promise<any[]> {
  try {
    // Create query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: query,
    });
    
    if (!embeddingResponse.data?.[0]?.embedding) {
      console.error('Failed to create embedding');
      return [];
    }
    
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Vector similarity search
    const supabase = getSupabaseClient();
    const { data: embeddings, error } = await supabase.rpc('match_menu_items', {
      query_embedding: queryEmbedding,
      match_threshold: RAG_SIM_THRESHOLD,
      match_count: RAG_TOP_K,
      p_restaurant_id: restaurantId
    });

    if (error) {
      console.error('Vector search failed:', error);
      return [];
    }

    return embeddings || [];
  } catch (error) {
    console.error('Retrieval failed:', error);
    return [];
  }
}

// Validation function
function validateResponse(response: string, retrievedItems: any[]): {
  valid: boolean;
  reason?: string;
  correctedResponse?: string;
} {
  try {
    const itemNames = retrievedItems.map(item => item.name.toLowerCase());
    const itemPrices = retrievedItems.map(item => item.price_cents);
    
    // Check for invented items
    const words = response.toLowerCase().split(/\s+/);
    const potentialItems = words.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'with', 'from', 'have', 'this', 'that', 'they', 'what', 'when', 'where'].includes(word)
    );
    
    const inventedItems = potentialItems.filter(word => 
      !itemNames.some(name => name.includes(word) || word.includes(name))
    );
    
    if (inventedItems.length > 0) {
      return {
        valid: false,
        reason: `Invented items: ${inventedItems.join(', ')}`,
        correctedResponse: "I can help you find items from our menu. What type of cuisine or dietary preference are you looking for?"
      };
    }
    
    // Check for price mismatches (if prices mentioned)
    const priceMatches = response.match(/\d+(?:\.\d{2})?/g);
    if (priceMatches) {
      const mentionedPrices = priceMatches.map(p => Math.round(parseFloat(p) * 100));
      const hasInvalidPrice = mentionedPrices.some(price => 
        !itemPrices.includes(price) && price > 0
      );
      
      if (hasInvalidPrice) {
        return {
          valid: false,
          reason: 'Price mismatch detected',
          correctedResponse: "I can help you find items from our menu. What type of cuisine or dietary preference are you looking for?"
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Validation failed:', error);
    return { valid: true }; // Fail open
  }
}

// Generate dynamic chips from retrieved items
function generateChips(items: any[]): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();
  
  // Extract unique categories and allergens
  items.forEach(item => {
    if (item.category && !seen.has(item.category)) {
      chips.push(`Show ${item.category}`);
      seen.add(item.category);
    }
    
    if (item.allergens) {
      item.allergens.forEach((allergen: string) => {
        if (!seen.has(allergen)) {
          chips.push(`Show ${allergen}`);
          seen.add(allergen);
        }
      });
    }
  });
  
  // Add common dietary preferences if relevant
  const hasVeg = items.some(item => 
    item.allergens?.includes('vegetarian') || 
    item.description?.toLowerCase().includes('vegetarian')
  );
  if (hasVeg && !seen.has('vegetarian')) {
    chips.push('Show vegetarian');
  }
  
  const hasSpicy = items.some(item => 
    item.description?.toLowerCase().includes('spicy') ||
    item.name.toLowerCase().includes('spicy')
  );
  if (hasSpicy && !seen.has('spicy')) {
    chips.push('Show spicy');
  }
  
  return chips.slice(0, 3); // Max 3 chips
}

// LLM-powered chat
async function chatWithLLM(
  restaurantId: string,
  message: string,
  retrievedItems: any[]
): Promise<{
  reply: { text: string; context?: string; chips: string[]; locale: string; intent: string };
  cards: any[];
  token_in: number;
  token_out: number;
  model: string;
}> {
  const systemPrompt = `You are a warm, helpful waiter at a restaurant. Be concise (max 450 characters), friendly, and accurate. Only mention items that exist in the provided menu. Don't invent items, prices, or ingredients. If asked about something not on the menu, politely redirect to what's available.`;

  const userPrompt = `Customer asks: "${message}"

Available menu items:
${retrievedItems.map(item => 
  `- ${item.name} (${item.price_cents / 100} SEK): ${item.description || 'No description'}`
).join('\n')}

Please provide a helpful, accurate response.`;

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: LLM_TOKEN_BUDGET,
    temperature: 0.7,
  });

  const replyText = response.choices[0]?.message?.content || '';
  const usage = response.usage;

  // Validate response
  const validation = validateResponse(replyText, retrievedItems);
  if (!validation.valid) {
         return {
       reply: {
         text: validation.correctedResponse || "I can help you find items from our menu. What are you looking for?",
         chips: ['Show vegetarian', 'Show spicy', 'Budget options'],
         locale: 'en',
         intent: 'llm_validation_failed'
       },
       cards: retrievedItems.slice(0, 3),
       token_in: usage?.prompt_tokens || 0,
       token_out: usage?.completion_tokens || 0,
       model: CHAT_MODEL
     };
  }

     return {
     reply: {
       text: replyText.slice(0, 450), // Ensure max length
       chips: generateChips(retrievedItems),
       locale: 'en',
       intent: 'llm'
     },
     cards: retrievedItems.slice(0, 3),
     token_in: usage?.prompt_tokens || 0,
     token_out: usage?.completion_tokens || 0,
     model: CHAT_MODEL
   };
}

// Intent-specific chip sets (rotate to avoid repetition)
const CHIP_SETS = {
  budget: [
    ['Cheapest three', 'Under 20 kr', 'Add a drink'],
    ['Best value', 'Budget picks', 'Pair with drink'],
    ['Affordable options', 'Under 25 kr', 'Complete meal']
  ],
  italian: [
    ['Vegetarian pizzas', 'Extra toppings', 'Spicy oil'],
    ['Pizza variations', 'Add cheese', 'Garlic bread'],
    ['Italian classics', 'Custom toppings', 'Side dishes']
  ],
  spicy: [
    ['Add chili oil', 'Extra garlic', 'Hot sauce'],
    ['Spice it up', 'Garlic options', 'Heat levels'],
    ['Make it hot', 'Chili options', 'Spicy sides']
  ],
  vegan: [
    ['Vegetarian options', 'Dairy-free', 'Suggest swaps'],
    ['Plant-based', 'Vegan swaps', 'Allergen info'],
    ['No dairy', 'Vegan mods', 'Alternative options']
  ],
  general: [
    ['Show vegetarian', 'Budget options', 'Popular picks'],
    ['Dietary needs', 'Price range', 'Chef recommendations'],
    ['Special requests', 'Allergen info', 'Best sellers']
  ]
};

// Fallback rule engine (improved with intent detection and varied responses)
function fallbackRuleEngine(message: string, menuItems: any[], lastIntent?: string): {
  reply: { text: string; context?: string; chips: string[]; locale: string; intent: string };
  cards: any[];
} {
  const q = message.toLowerCase();
  const allItems = menuItems || [];
  
     // Budget intent
   if (q.includes('budget') || q.includes('cheap') || q.includes('affordable') || q.includes('price')) {
     const budgetItems = allItems
       .sort((a, b) => (a.price_cents || 0) - (b.price_cents || 0))
       .slice(0, 3);
     
     const chipSet = CHIP_SETS.budget[Math.floor(Math.random() * CHIP_SETS.budget.length)] || CHIP_SETS.budget[0];
     const text = budgetItems.length > 0 
       ? `Here are our best-value picks (${budgetItems.length} under ${Math.max(...budgetItems.map(i => i.price_cents || 0)) / 100} kr). Want a drink to pair?`
       : "I can help you find our most affordable options. What's your budget range?";
     
     return {
       reply: {
         text,
         chips: chipSet,
         locale: 'en',
         intent: 'budget'
       },
       cards: budgetItems
     };
   }
  
     // Italian intent
   if (q.includes('italian') || q.includes('pizza') || q.includes('pasta')) {
     const italianItems = allItems.filter(item => 
       item.description?.toLowerCase().includes('italian') ||
       item.name.toLowerCase().includes('pizza') ||
       item.name.toLowerCase().includes('pasta') ||
       item.name.toLowerCase().includes('bruschetta')
     );
     
     const chipSet = CHIP_SETS.italian[Math.floor(Math.random() * CHIP_SETS.italian.length)] || CHIP_SETS.italian[0];
     const text = italianItems.length > 0 
       ? `Here are our Italian picks! ${italianItems.length > 1 ? 'Both are popular choices.' : 'This is a customer favorite.'} Want vegetarian or spicy options?`
       : "We focus on Italian classics. Want to see our current menu?";
     
     return {
       reply: {
         text,
         chips: chipSet,
         locale: 'en',
         intent: 'italian'
       },
       cards: italianItems.slice(0, 3)
     };
   }
  
     // Spicy intent
   if (q.includes('spicy') || q.includes('hot') || q.includes('chili')) {
     const spicyItems = allItems.filter(item => 
       item.description?.toLowerCase().includes('spicy') ||
       item.name.toLowerCase().includes('spicy') ||
       item.description?.toLowerCase().includes('chili')
     );
     
     const chipSet = CHIP_SETS.spicy[Math.floor(Math.random() * CHIP_SETS.spicy.length)] || CHIP_SETS.spicy[0];
     const text = spicyItems.length > 0 
       ? `Found ${spicyItems.length} spicy option${spicyItems.length > 1 ? 's' : ''}! Want to see milder alternatives?`
       : "Nothing marked spicy, but we can add chili oil or extra garlic to any dish. Want to see our options?";
     
     return {
       reply: {
         text,
         chips: chipSet,
         locale: 'en',
         intent: 'spicy'
       },
       cards: spicyItems.length > 0 ? spicyItems.slice(0, 3) : allItems.slice(0, 2)
     };
   }
  
     // Vegan intent
   if (q.includes('vegan') || q.includes('plant-based')) {
     const veganItems = allItems.filter(item => 
       item.description?.toLowerCase().includes('vegan') ||
       item.allergens?.some((a: string) => a.toLowerCase() === 'vegan')
     );
     
     const chipSet = CHIP_SETS.vegan[Math.floor(Math.random() * CHIP_SETS.vegan.length)] || CHIP_SETS.vegan[0];
     const text = veganItems.length > 0 
       ? `Found ${veganItems.length} vegan option${veganItems.length > 1 ? 's' : ''}! Need vegetarian alternatives?`
       : "I don't see items marked vegan, but many vegetarian dishes can be made vegan. Want to see those options?";
     
     return {
       reply: {
         text,
         chips: chipSet,
         locale: 'en',
         intent: 'vegan'
       },
       cards: veganItems.slice(0, 3)
     };
   }
  
     // Cuisine deflection (Indian, Mexican, etc.)
   const cuisineKeywords = ['indian', 'mexican', 'chinese', 'thai', 'japanese', 'korean', 'greek', 'french'];
   const matchedCuisine = cuisineKeywords.find(cuisine => q.includes(cuisine));
   
   if (matchedCuisine) {
     const chipSet = CHIP_SETS.general[Math.floor(Math.random() * CHIP_SETS.general.length)] || CHIP_SETS.general[0];
     const text = `We don't serve ${matchedCuisine} dishes, but our Bruschetta and Margherita are popular. Want vegetarian or budget picks?`;
     
     return {
       reply: {
         text,
         chips: chipSet,
         locale: 'en',
         intent: 'cuisine_deflection'
       },
       cards: allItems.slice(0, 2)
     };
   }
  
     // Greeting or general help
   if (q.includes('hello') || q.includes('hi') || q.includes('help') || q.length < 10) {
     const chipSet = CHIP_SETS.general[Math.floor(Math.random() * CHIP_SETS.general.length)] || CHIP_SETS.general[0];
     const text = "Got it! I can suggest a few things right away. What type of cuisine or dietary preference are you looking for?";
     
     return {
       reply: {
         text,
         chips: chipSet,
         locale: 'en',
         intent: 'greeting'
       },
       cards: allItems.slice(0, 2)
     };
   }
  
     // Default response (varies based on last intent to avoid repetition)
   const chipSet = CHIP_SETS.general[Math.floor(Math.random() * CHIP_SETS.general.length)] || CHIP_SETS.general[0];
   const text = lastIntent === 'general' 
     ? "I can help with cuisines, dietary needs, or budget. What are you looking for?"
     : "I can suggest cuisines, dietary options, or budget picks. What interests you?";
   
   return {
     reply: {
       text,
       chips: chipSet,
       locale: 'en',
       intent: 'general'
     },
     cards: allItems.slice(0, 3)
   };
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const origin = new URL(req.url).origin;
  
  try {
    // Parse and validate request
    const raw = await req.json();
    const { restaurantId, sessionToken, message, lastIntent } = BodySchema.parse(raw);
    
         // Check quota first
     const quota = await checkQuota(restaurantId);
     if (!quota.allowed) {
       const fallback = fallbackRuleEngine(message, [], lastIntent);
       fallback.reply.chips = ['Upgrade plan'];
       
       return withCORS(
         NextResponse.json({ reply: fallback.reply, cards: fallback.cards }, { status: 200 }),
         origin
       );
     }
    
         // Try LLM if enabled, OpenAI key available, and restaurant is pilot
     if (CHAT_LLM_ENABLED && OPENAI_API_KEY && isPilotRestaurant(restaurantId)) {
      try {
        // Retrieve relevant items
        const retrievedItems = await retrieveRelevantItems(restaurantId, message);
        
        // Chat with LLM
        const llmResult = await chatWithLLM(restaurantId, message, retrievedItems);
        
        // Increment usage
        const period = new Date().toISOString().slice(0, 7);
        await incrementUsage(restaurantId, period, 1, llmResult.token_in + llmResult.token_out);
        
        // Log telemetry
        logChatEvent({
          restaurantId,
          sessionToken,
          retrievalIds: retrievedItems.map(item => item.id),
          token_in: llmResult.token_in,
          token_out: llmResult.token_out,
          model: llmResult.model,
          latency_ms: Date.now() - startTime,
          validator_pass: true,
          source: 'llm',
          message
        });
        
        const res = NextResponse.json({
          reply: llmResult.reply,
          cards: llmResult.cards
        }, { status: 200 });
        
        return withCORS(res, origin);
      } catch (llmError) {
        console.error('LLM chat failed, falling back to rules:', llmError);
        logError('llm_chat_failed', llmError, { restaurantId, message });
      }
    }
    
         // Fallback to rule engine
     const menuItems = await getMenuItems(restaurantId);
     const fallback = fallbackRuleEngine(message, menuItems, lastIntent);
     
     // Log telemetry for fallback
     logChatEvent({
       restaurantId,
       sessionToken,
       retrievalIds: [],
       token_in: 0,
       token_out: 0,
       model: 'rules',
       latency_ms: Date.now() - startTime,
       validator_pass: true,
       source: 'rules',
       message
     });
     
     const res = NextResponse.json({
       reply: fallback.reply,
       cards: fallback.cards
     }, { status: 200 });
     
     return withCORS(res, origin);
    
  } catch (error) {
    logError('chat_api_error', error, { 
      restaurantId: 'unknown', 
      message: 'parse_error' 
    });
    
         const errorResponse = {
       reply: {
         text: "I'm having trouble right now. Please try again in a moment.",
         chips: ['Show vegetarian', 'Spicy dishes', 'Budget options'],
         locale: 'en',
         intent: 'error'
       },
       cards: []
     };
    
    const res = NextResponse.json(errorResponse, { status: 200 });
    return withCORS(res, origin);
  }
}

// Helper function to get menu items
async function getMenuItems(restaurantId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('menu_items')
      .select('id, name, description, allergens, category, price_cents')
      .eq('restaurant_id', restaurantId);
    
    return data || [];
  } catch (error) {
    console.error('Failed to get menu items:', error);
    return [];
  }
}