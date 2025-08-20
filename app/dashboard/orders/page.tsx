import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import OrdersList from './OrdersList'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Get user's restaurant access
  const { data: userRestaurants } = await supabase
    .from('restaurant_staff')
    .select(`
      role,
      restaurants (
        id,
        name
      )
    `)
    .eq('user_id', session.user.id)

  const restaurant = userRestaurants?.[0]?.restaurants as any
  const userRole = userRestaurants?.[0]?.role || 'viewer'

  if (!restaurant) {
    redirect('/login')
  }

  // Get orders for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  // Calculate 7-day KPIs
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const orders7d = orders?.filter(order => new Date(order.created_at) >= sevenDaysAgo) || []
  const paid7d = orders7d.filter(order => order.status === 'paid')
  const gmv7d = paid7d.reduce((sum, order) => sum + (order.total_cents || 0), 0)
  const aov7d = paid7d.length > 0 ? gmv7d / paid7d.length : 0

  const kpis = {
    orders7d: orders7d.length,
    paid7d: paid7d.length,
    gmv7d: gmv7d / 100, // Convert cents to currency
    aov7d: aov7d / 100, // Convert cents to currency
    currency: restaurant.currency || 'SEK'
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage your restaurant orders.
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-4">
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
                    {kpis.gmv7d.toFixed(2)} {kpis.currency}
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
                    {kpis.aov7d.toFixed(2)} {kpis.currency}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OrdersList 
        restaurantId={restaurant.id}
        userRole={userRole}
        initialOrders={orders || []}
      />
    </div>
  )
}
