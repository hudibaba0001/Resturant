import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SettingsForm from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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
        address,
        city,
        country,
        phone,
        email,
        opening_hours,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your restaurant information and opening hours
        </p>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Restaurant Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-sm text-gray-900">{restaurant.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            <p className="mt-1 text-sm text-gray-900">{restaurant.slug}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <p className="mt-1 text-sm text-gray-900">{restaurant.address}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <p className="mt-1 text-sm text-gray-900">{restaurant.city}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <p className="mt-1 text-sm text-gray-900">{restaurant.country}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <p className="mt-1 text-sm text-gray-900">{restaurant.phone || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{restaurant.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <div className="mt-1 flex space-x-2">
              {restaurant.is_active && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              )}
              {restaurant.is_verified && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Opening Hours */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Opening Hours</h2>
        <p className="text-sm text-gray-600 mb-4">
          Set your restaurant's opening hours. The widget will show a "Closed" banner when you're not open.
        </p>
        
        <SettingsForm 
          restaurantId={restaurant.id}
          openingHours={restaurant.opening_hours}
          userRole={userRole}
        />
      </div>

      {/* Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Need help?</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Opening hours use 24-hour format (e.g., "09:00" for 9 AM)</li>
          <li>• Leave both fields empty for a day to mark it as closed</li>
          <li>• For overnight hours (e.g., 18:00-02:00), enter the actual times</li>
          <li>• Changes take effect immediately on your widget</li>
        </ul>
      </div>
    </div>
  );
}
