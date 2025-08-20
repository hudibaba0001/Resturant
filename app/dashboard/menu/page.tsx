import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MenuManager from './MenuManager';

export const dynamic = 'force-dynamic';

export default async function MenuPage({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
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
      {/* Welcome Message */}
      {searchParams.welcome === 'true' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Welcome to Stjarna! 🎉
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Your restaurant has been created successfully. Start by adding your first menu items below!</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
