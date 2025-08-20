import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

// Node runtime (Supabase admin)
export const runtime = 'nodejs'

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

    // Check if restaurant is open using SQL function
    const { data, error } = await supabaseAdmin.rpc('is_restaurant_open', {
      p_restaurant_id: restaurantId
    })

    if (error) {
      console.error('Status check error:', error)
      return NextResponse.json(
        { error: 'Failed to check restaurant status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ open: data || false })

  } catch (error) {
    console.error('Status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
