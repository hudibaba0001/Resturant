import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MenuManager from './MenuManager';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
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
  const userRole = (userRestaurants as any)?.[0]?.role || 'viewer';
  
  if (!restaurant) {
    redirect('/login?error=no_restaurant');
  }

  // Get menu sections and items with RLS
  const { data: sections } = await supabase
    .from('menu_sections')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('position');

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your menu sections and items. {userRole === 'viewer' && '(Read-only)'}
        </p>
      </div>

      <MenuManager 
        restaurantId={restaurant.id}
        sections={sections || []}
        items={items || []}
        userRole={userRole}
      />
    </div>
  );
}
