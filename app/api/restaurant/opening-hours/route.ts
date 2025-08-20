import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const openingHoursSchema = z.object({
  restaurantId: z.string().uuid(),
  openingHours: z.record(z.object({
    open: z.string().optional(),
    close: z.string().optional()
  })).optional()
});

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = openingHoursSchema.parse(body);

    // Check if user has permission for this restaurant
    const { data: userRestaurants } = await supabase
      .from('restaurant_staff')
      .select('role')
      .eq('restaurant_id', validatedData.restaurantId)
      .eq('user_id', session.user.id);

    const userRole = userRestaurants?.[0]?.role;
    if (!userRole || (userRole !== 'editor' && userRole !== 'manager' && userRole !== 'owner')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the restaurant's opening hours
    const { data: updatedRestaurant, error } = await supabase
      .from('restaurants')
      .update({ opening_hours: validatedData.openingHours })
      .eq('id', validatedData.restaurantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating opening hours:', error);
      return NextResponse.json({ error: 'Failed to update opening hours' }, { status: 500 });
    }

    return NextResponse.json(updatedRestaurant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error in PUT /api/restaurant/opening-hours:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
