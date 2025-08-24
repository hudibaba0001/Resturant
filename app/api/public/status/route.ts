import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id') || searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call the restaurant_open_now function
    const { data, error } = await supabase.rpc('restaurant_open_now', {
      p_restaurant: restaurantId
    });

    if (error) {
      console.error('Error checking restaurant status:', error);
      return NextResponse.json(
        { error: 'Failed to check restaurant status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ open: data });
  } catch (error) {
    console.error('Status endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
