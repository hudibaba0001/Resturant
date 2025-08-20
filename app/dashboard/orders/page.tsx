import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import OrdersList from './OrdersList';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get user's restaurant with RLS
  const { data: userRestaurants } = await supabase
    .from('restaurant_staff')
    .select(`
      role,
      restaurants (
        id,
        name,
        slug,
        is_active,
        is_verified
      )
    `)
    .eq('user_id', session.user.id);

  const restaurant = (userRestaurants as any)?.[0]?.restaurants;
  
  if (!restaurant) {
    redirect('/login?error=no_restaurant');
  }

  // Get orders with RLS
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false });

  // Calculate 7-day KPIs
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const orders7d = orders?.filter(order => new Date(order.created_at) >= sevenDaysAgo) || [];
  const paidOrders7d = orders7d.filter(order => order.status === 'paid');
  const totalGMV7d = paidOrders7d.reduce((sum, order) => sum + (order.total_cents || 0), 0);
  const aov7d = paidOrders7d.length > 0 ? totalGMV7d / paidOrders7d.length : 0;

  const kpis = {
    orders7d: orders7d.length,
    paid7d: paidOrders7d.length,
    gmv7d: totalGMV7d,
    aov7d: aov7d
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage customer orders
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Orders (7d)</dt>
                  <dd className="text-lg font-medium text-gray-900">{kpis.orders7d}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Paid (7d)</dt>
                  <dd className="text-lg font-medium text-gray-900">{kpis.paid7d}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">💰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">GMV (7d)</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    SEK {(kpis.gmv7d / 100).toFixed(0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📈</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">AOV (7d)</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    SEK {(kpis.aov7d / 100).toFixed(0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OrdersList 
        orders={orders || []}
        restaurantId={restaurant.id}
      />
    </div>
  );
}
