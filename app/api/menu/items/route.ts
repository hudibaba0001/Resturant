import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createItemSchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price_cents: z.number().int().min(0),
  currency: z.string().length(3),
  tags: z.array(z.string()).optional(),
  is_available: z.boolean(),
  section_id: z.string().uuid().optional()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createItemSchema.parse(body);

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

    // Create the menu item
    const { data: newItem, error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: validatedData.restaurantId,
        name: validatedData.name,
        description: validatedData.description,
        price_cents: validatedData.price_cents,
        currency: validatedData.currency,
        tags: validatedData.tags,
        is_available: validatedData.is_available,
        section_id: validatedData.section_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating menu item:', error);
      return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
    }

    return NextResponse.json(newItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error in POST /api/menu/items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
