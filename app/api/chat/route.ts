// Node runtime (Supabase admin, OpenAI)
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getOpenAI, CHAT_MODEL } from '@/lib/ai'
import { z } from 'zod'
import { CORS_HEADERS } from '@/lib/cors'

const chatSchema = z.object({
  restaurantId: z.string().uuid(),
  sessionToken: z.string(),
  message: z.string().min(1),
})

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurantId, sessionToken, message } = chatSchema.parse(body)

    const supabaseAdmin = getSupabaseAdmin()
    const openai = getOpenAI()

    // Get restaurant details
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .eq('is_active', true)
      .single()

    if (restaurantError || !restaurant) {
          return NextResponse.json(
      { error: 'Restaurant not found' },
      { status: 404, headers: CORS_HEADERS }
    )
    }

    // Get menu items for context
    const { data: menuItems } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)

    // Create context for AI
    const context = `
Restaurant: ${restaurant.name}
Description: ${restaurant.description || 'No description available'}
Cuisine: ${restaurant.cuisine_type || 'Not specified'}

Available Menu Items:
${menuItems?.map(item => `- ${item.name}: $${item.price} (${item.description || 'No description'})`).join('\n') || 'No menu items available'}

Customer Question: ${message}
`

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant for ${restaurant.name}. Answer customer questions about the restaurant, menu items, and services. Be friendly, accurate, and helpful. If you don't know something, say so politely.`
        },
        {
          role: 'user',
          content: context
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not process your request.'

    return NextResponse.json({
      response,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      }
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}