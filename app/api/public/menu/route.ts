import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId') || searchParams.get('restaurant_id')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Missing restaurantId parameter' },
        { status: 400 }
      )
    }

    // For now, return a simple menu structure
    // TODO: Replace with actual database queries when menu tables are set up
    const menuData = {
      sections: [
        {
          id: '1',
          name: 'Appetizers',
          description: 'Start your meal right',
          position: 1,
          items: [
            {
              id: '1',
              name: 'Bruschetta',
              description: 'Toasted bread with tomatoes and herbs',
              price: '12.50',
              price_cents: 1250,
              currency: 'SEK',
              allergens: []
            }
          ]
        },
        {
          id: '2',
          name: 'Main Courses',
          description: 'Delicious main dishes',
          position: 2,
          items: [
            {
              id: '2',
              name: 'Margherita Pizza',
              description: 'Classic tomato and mozzarella pizza',
              price: '18.90',
              price_cents: 1890,
              currency: 'SEK',
              allergens: ['gluten', 'dairy']
            }
          ]
        }
      ]
    }

    return NextResponse.json(
      menuData,
      { 
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
          'ETag': `"menu-${restaurantId}-${Date.now()}"`
        }
      }
    )

  } catch (error) {
    console.error('Menu API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
