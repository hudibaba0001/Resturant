import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const markPaidSchema = z.object({
  restaurantId: z.string().uuid()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    );
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = markPaidSchema.parse(body);

    // Get the order to check restaurant ownership
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('restaurant_id, status')
      .eq('id', params.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify the order belongs to the specified restaurant
    if (order.restaurant_id !== validatedData.restaurantId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if user has permission for this restaurant
    const { data: userRestaurants } = await supabase
      .from('restaurant_staff')
      .select('role')
      .eq('restaurant_id', validatedData.restaurantId)
      .eq('user_id', session.user.id);

    const userRole = userRestaurants?.[0]?.role;
    if (!userRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the order status to paid
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error marking order as paid:', error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error in PATCH /api/orders/[id]/mark-paid:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
