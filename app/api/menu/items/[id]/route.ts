import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price_cents: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  tags: z.array(z.string()).optional(),
  is_available: z.boolean().optional(),
  section_id: z.string().uuid().optional()
});

const patchItemSchema = z.object({
  is_available: z.boolean()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateItemSchema.parse(body);

    // Get the menu item to check restaurant ownership
    const { data: menuItem, error: fetchError } = await supabase
      .from('menu_items')
      .select('restaurant_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Check if user has permission for this restaurant
    const { data: userRestaurants } = await supabase
      .from('restaurant_staff')
      .select('role')
      .eq('restaurant_id', menuItem.restaurant_id)
      .eq('user_id', session.user.id);

    const userRole = userRestaurants?.[0]?.role;
    if (!userRole || (userRole !== 'editor' && userRole !== 'manager' && userRole !== 'owner')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the menu item
    const { data: updatedItem, error } = await supabase
      .from('menu_items')
      .update(validatedData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating menu item:', error);
      return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error in PUT /api/menu/items/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = patchItemSchema.parse(body);

    // Get the menu item to check restaurant ownership
    const { data: menuItem, error: fetchError } = await supabase
      .from('menu_items')
      .select('restaurant_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Check if user has permission for this restaurant
    const { data: userRestaurants } = await supabase
      .from('restaurant_staff')
      .select('role')
      .eq('restaurant_id', menuItem.restaurant_id)
      .eq('user_id', session.user.id);

    const userRole = userRestaurants?.[0]?.role;
    if (!userRole || (userRole !== 'editor' && userRole !== 'manager' && userRole !== 'owner')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the menu item
    const { data: updatedItem, error } = await supabase
      .from('menu_items')
      .update(validatedData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating menu item:', error);
      return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error in PATCH /api/menu/items/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
