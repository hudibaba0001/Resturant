import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Home, Menu, ShoppingCart, Settings, LogOut } from 'lucide-react';
import { initSentry } from '@/lib/sentry';
import { getSupabaseServer } from '@/lib/supabaseServer';

// Initialize Sentry for error tracking
initSentry();

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = getSupabaseServer();
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get user's restaurants with RLS
  let userRestaurants;
  let restaurant;
  
  try {
    const { data, error } = await supabase
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

    if (error) {
      console.error('Failed to fetch restaurants:', error);
      redirect('/onboard?error=fetch_failed');
    }

    userRestaurants = data;
    restaurant = (userRestaurants as any)?.[0]?.restaurants;
  } catch (error) {
    console.error('Error in dashboard layout:', error);
    redirect('/onboard?error=layout_error');
  }
  
  if (!restaurant) {
    redirect('/onboard?welcome=true');
  }

  const handleSignOut = async () => {
    'use server';
    const supabase = getSupabaseServer();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {restaurant.name}
              </h1>
              <div className="ml-4 flex space-x-2">
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
            <form action={handleSignOut}>
              <button
                type="submit"
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/dashboard/menu"
              className="flex items-center py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              <Menu className="h-4 w-4 mr-2" />
              Menu
            </Link>
            <Link
              href="/dashboard/orders"
              className="flex items-center py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Orders
            </Link>
            <Link
              href="/dashboard/embed"
              className="flex items-center py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              <Home className="h-4 w-4 mr-2" />
              Embed
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
