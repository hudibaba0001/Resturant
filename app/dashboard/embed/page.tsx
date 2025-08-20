import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import EmbedClient from './EmbedClient';

export const dynamic = 'force-dynamic';

export default async function EmbedPage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );
  
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

  // Check restaurant status
  const { data: statusData } = await supabase
    .rpc('is_restaurant_open', { p_restaurant_id: restaurant.id });

  const isOpen = statusData || false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Embed Widget</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add the widget to your website to enable chat and ordering
        </p>
      </div>

      {/* Restaurant Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Restaurant Status</h2>
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-sm font-medium text-gray-900">
            {isOpen ? 'Open' : 'Closed'}
          </span>
          <span className="text-sm text-gray-500">
            {restaurant.is_active && restaurant.is_verified 
              ? 'Widget is active and ready to use' 
              : 'Widget is not active (restaurant needs to be active and verified)'}
          </span>
        </div>
      </div>

      {/* Embed Snippet */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Embed Code</h2>
        <p className="text-sm text-gray-600 mb-4">
          Copy and paste this code into your website's HTML, just before the closing &lt;/body&gt; tag:
        </p>
        
        <EmbedClient 
          restaurantId={restaurant.id}
          isActive={restaurant.is_active && restaurant.is_verified}
        />
      </div>

      {/* Live Preview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h2>
        <p className="text-sm text-gray-600 mb-4">
          See how the widget will appear on your website:
        </p>
        
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="text-center text-sm text-gray-500 mb-4">
            Your website content would appear here...
          </div>
          
          <div className="relative h-96 border border-gray-300 rounded-lg bg-white">
            <iframe
              src={`/widget-preview?restaurantId=${restaurant.id}`}
              className="w-full h-full rounded-lg"
              title="Widget Preview"
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• The widget appears as a floating button in the bottom-right corner</li>
          <li>• Customers can chat with AI about your menu and get personalized recommendations</li>
          <li>• They can add items to cart and place orders for pickup or dine-in</li>
          <li>• Orders are automatically sent to your dashboard</li>
          <li>• The widget respects your opening hours and shows a "Closed" banner when appropriate</li>
        </ul>
      </div>
    </div>
  );
}
