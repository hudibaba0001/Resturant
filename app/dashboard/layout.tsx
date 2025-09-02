import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Home, Menu, ShoppingCart, Settings, LogOut, BarChart3, FileText, User, Link as LinkIcon } from 'lucide-react';
import { initSentry } from '@/lib/sentry';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { RestaurantProvider } from './RestaurantContext';

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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get user's restaurants with RLS - simplified and resilient
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id,name,slug,is_active,is_verified')
    .eq('owner_id', session.user.id)
    .limit(1);

  // If no tenant yet, send to onboarding instead of crashing
  if (!error && (!restaurants || restaurants.length === 0)) {
    redirect('/onboard?welcome=true');
  }

  if (error) {
    console.error('Failed to fetch restaurants:', error);
    redirect('/onboard?error=fetch_failed');
  }

  const restaurant = restaurants[0]!; // Non-null assertion since we check length above

  const handleSignOut = async () => {
    'use server';
    const supabase = getSupabaseServer();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Fixed Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 fixed h-full overflow-y-auto z-50">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center text-white font-semibold text-sm">
              🍽️
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm leading-tight">
                {restaurant.name}
              </h1>
              <div className="flex gap-1 mt-1">
                {restaurant.is_active && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Active
                  </span>
                )}
                {restaurant.is_verified && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2">
          <div className="mb-4">
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Main
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/menus"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
            >
              <Menu className="h-4 w-4" />
              Menus
            </Link>
          </div>

          <div className="mb-4">
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Management
            </div>
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              Orders
            </Link>
            <Link
              href="/dashboard/items"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
            >
              <FileText className="h-4 w-4" />
              Menu Items
            </Link>
            <Link
              href="/dashboard/sections"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
            >
              <FileText className="h-4 w-4" />
              Menu Sections
            </Link>
          </div>

          <div className="mb-4">
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Settings
            </div>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
            >
              <Settings className="h-4 w-4" />
              Restaurant Settings
            </Link>
            <Link
              href="/dashboard/widget"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
            >
              <LinkIcon className="h-4 w-4" />
              Widget Setup
            </Link>
          </div>

          <div className="mb-4">
            <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Account
            </div>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <Link
              href="/onboard"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
            >
              <Home className="h-4 w-4" />
              Onboarding
            </Link>
          </div>
        </nav>

        {/* Sign Out */}
        <div className="p-2 mt-auto border-t border-gray-200">
          <form action={handleSignOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-60">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back! Here's what's happening today.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                🔔
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-200 transition-colors">
                <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded text-white text-xs font-semibold flex items-center justify-center">
                  {session.user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{session.user.email}</div>
                  <div className="text-xs text-gray-600">Owner</div>
                </div>
                <span className="text-gray-500 text-xs">▼</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <RestaurantProvider restaurant={restaurant}>
            {children}
          </RestaurantProvider>
        </main>
      </div>
    </div>
  );
}
