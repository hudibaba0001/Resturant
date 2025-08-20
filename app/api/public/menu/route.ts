import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Missing restaurantId parameter' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get menu sections
    const { data: sections, error: sectionsError } = await supabaseAdmin
      .from('menu_sections')
      .select('id, name, description, position')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (sectionsError) {
      console.error('Sections query error:', sectionsError)
      return NextResponse.json(
        { error: 'Failed to fetch menu sections' },
        { status: 500 }
      )
    }

    // Get menu items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, description, price, price_cents, currency, category, allergens, is_available')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('name', { ascending: true })

    if (itemsError) {
      console.error('Items query error:', itemsError)
      return NextResponse.json(
        { error: 'Failed to fetch menu items' },
        { status: 500 }
      )
    }

    // Group items by category/section
    const menuData = sections?.map(section => ({
      id: section.id,
      name: section.name,
      description: section.description,
      position: section.position,
      items: items?.filter(item => item.category === section.name).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        price_cents: item.price_cents,
        currency: item.currency || 'SEK',
        allergens: item.allergens || []
      })) || []
    })) || []

    return NextResponse.json({ sections: menuData })

  } catch (error) {
    console.error('Menu API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
