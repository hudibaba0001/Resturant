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

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema
const BodySchema = z.object({
  restaurantId: z.string().min(1),
  sessionToken: z.string().min(1),
  message: z.string().min(1).max(500),
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
  reply: { text: string; context?: string; chips: string[]; locale: string };
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
        locale: 'en'
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
      locale: 'en'
    },
    cards: retrievedItems.slice(0, 3),
    token_in: usage?.prompt_tokens || 0,
    token_out: usage?.completion_tokens || 0,
    model: CHAT_MODEL
  };
}

// Fallback rule engine (existing logic)
function fallbackRuleEngine(message: string, menuItems: any[]): {
  reply: { text: string; context?: string; chips: string[]; locale: string };
  cards: any[];
} {
  const q = message.toLowerCase();
  const allItems = menuItems || [];
  
  // Simple intent detection
  if (q.includes('vegan') || q.includes('plant-based')) {
    const veganItems = allItems.filter(item => 
      item.description?.toLowerCase().includes('vegan') ||
      item.allergens?.some((a: string) => a.toLowerCase() === 'vegan')
    );
    return {
      reply: {
        text: veganItems.length > 0 
          ? `Found ${veganItems.length} vegan options. Need vegetarian alternatives?`
          : "I don't see items marked vegan, but many vegetarian dishes can be made vegan.",
        chips: ['Show vegetarian', 'Suggest swaps', 'Budget options'],
        locale: 'en'
      },
      cards: veganItems.slice(0, 3)
    };
  }
  
  if (q.includes('italian') || q.includes('pizza') || q.includes('pasta')) {
    const italianItems = allItems.filter(item => 
      item.description?.toLowerCase().includes('italian') ||
      item.name.toLowerCase().includes('pizza') ||
      item.name.toLowerCase().includes('pasta')
    );
    return {
      reply: {
        text: "Here are a few Italian picks we serve. Looking for vegetarian or spicy?",
        chips: ['Filter vegetarian', 'Show spicy', 'Compare two dishes'],
        locale: 'en'
      },
      cards: italianItems.slice(0, 3)
    };
  }
  
  // Default response
  return {
    reply: {
      text: "I can help with cuisines, dietary needs, or budget. What are you looking for?",
      chips: ['Show vegetarian', 'Spicy dishes', 'Budget options'],
      locale: 'en'
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
    const { restaurantId, sessionToken, message } = BodySchema.parse(raw);
    
    // Check quota first
    const quota = await checkQuota(restaurantId);
    if (!quota.allowed) {
      const fallback = fallbackRuleEngine(message, []);
      fallback.reply.chips = ['Upgrade plan'];
      
      return withCORS(
        NextResponse.json({ reply: fallback.reply, cards: fallback.cards }, { status: 200 }),
        origin
      );
    }
    
    // Try LLM if enabled and OpenAI key available
    if (CHAT_LLM_ENABLED && OPENAI_API_KEY) {
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
    const fallback = fallbackRuleEngine(message, menuItems);
    
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
        locale: 'en'
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