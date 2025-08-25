import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import OrdersTable from './OrdersTable';

export default async function OrdersPage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookies().set(name, value, options);
        },
        remove(name: string, options: any) {
          cookies().set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Get user's restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (restaurantError || !restaurant) {
    redirect('/dashboard');
  }

  // Get orders for this restaurant
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      *,
      menu_items(id, name, price_cents)
    `)
    .eq('restaurant_id', restaurant.id)
    .in('status', ['paid', 'ready', 'picked_up'])
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600 mt-2">
          Manage pickup orders for {restaurant.name}
        </p>
      </div>

      <OrdersTable 
        orders={orders || []} 
        restaurantId={restaurant.id}
      />
    </div>
  );
}
