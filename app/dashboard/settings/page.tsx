import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
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
        name,
        opening_hours,
        is_active,
        is_verified
      )
    `)
    .eq('user_id', session.user.id)

  const restaurant = userRestaurants?.[0]?.restaurants as any
  const userRole = userRestaurants?.[0]?.role || 'viewer'

  if (!restaurant || !restaurant.is_active || !restaurant.is_verified) {
    redirect('/login')
  }

  const canEdit = userRole === 'manager' || userRole === 'owner'

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your restaurant settings and opening hours.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {/* Restaurant Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Restaurant Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Name:</span>
              <span className="ml-2 text-sm text-gray-900">{restaurant.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                restaurant.is_active && restaurant.is_verified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {restaurant.is_active && restaurant.is_verified ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Your Role:</span>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {userRole}
              </span>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Opening Hours</h2>
          {canEdit ? (
            <SettingsForm 
              restaurantId={restaurant.id}
              initialOpeningHours={restaurant.opening_hours}
            />
          ) : (
            <div className="text-sm text-gray-500">
              You need manager or owner permissions to edit opening hours.
            </div>
          )}
        </div>

        {/* Stripe Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Settings</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Stripe Status:</span>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Connected (Platform Account)
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Payments are processed through our platform Stripe account. 
              Individual restaurant Stripe Connect accounts will be available in a future update.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
