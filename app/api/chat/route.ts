export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, sessionId, restaurantId } = body;
    
    if (!message) {
      return NextResponse.json({ 
        reply: { 
          text: 'Hi! Ask me about our menu, ingredients, or recommendations.', 
          chips: ['Popular items', 'Vegan options', 'Spicy dishes'], 
          locale: 'en' 
        }, 
        cards: [] 
      });
    }

    // If no OpenAI key, return helpful fallback
    if (!openai) {
      return NextResponse.json({ 
        reply: { 
          text: 'I can help you find menu items! What are you looking for?', 
          chips: ['Show menu', 'Popular items', 'Dietary options'], 
          locale: 'en' 
        }, 
        cards: [] 
      });
    }

    // Get menu items for context
    let menuContext = '';
    if (restaurantId) {
      try {
        const { data: items } = await supabase
          .from('menu_items')
          .select('name, description, price_cents, currency, dietary, allergens')
          .eq('restaurant_id', restaurantId)
          .eq('is_available', true)
          .limit(20);

        if (items && items.length > 0) {
          menuContext = `Available menu items:\n${items.map(item => 
            `- ${item.name}: ${item.description || 'No description'} (${item.price_cents ? `${item.price_cents/100} ${item.currency}` : 'Price not set'})${item.dietary?.length ? ` [${item.dietary.join(', ')}]` : ''}`
          ).join('\n')}`;
        }
      } catch (error) {
        console.error('Error fetching menu items:', error);
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

    // Generate follow-up suggestions
    const suggestions = ['Popular items', 'Vegan options', 'Spicy dishes', 'Show full menu'];

    return NextResponse.json({ 
      reply: { 
        text: aiResponse, 
        chips: suggestions, 
        locale: 'en' 
      }, 
      cards: [] 
    });

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
    });
  }
}