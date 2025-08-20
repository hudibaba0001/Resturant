import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MenuManager from './MenuManager'

export default async function MenuPage() {
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

  // Get menu sections
  const { data: sections } = await supabase
    .from('menu_sections')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('position')

  // Get menu items
  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('name')

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Menu Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your menu sections and items.
          </p>
        </div>
      </div>
      
      <MenuManager 
        restaurantId={restaurant.id}
        userRole={userRole}
        initialSections={sections || []}
        initialItems={items || []}
      />
    </div>
  )
}
