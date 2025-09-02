import { Suspense } from 'react';
import Link from 'next/link';
import { BarChart3, ShoppingCart, Users, Star, Plus, Menu, Settings, Link as LinkIcon } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Today's Revenue</div>
            <div className="w-5 h-5 bg-green-100 text-green-600 rounded flex items-center justify-center text-xs">💰</div>
          </div>
          <div className="text-xl font-semibold text-gray-900 mb-1">12,450 SEK</div>
          <div className="text-xs text-green-600">+15% from yesterday</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Orders</div>
            <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">📦</div>
          </div>
          <div className="text-xl font-semibold text-gray-900 mb-1">16</div>
          <div className="text-xs text-gray-600">8 pending, 5 preparing</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customers Served</div>
            <div className="w-5 h-5 bg-yellow-100 text-yellow-600 rounded flex items-center justify-center text-xs">👥</div>
          </div>
          <div className="text-xl font-semibold text-gray-900 mb-1">64</div>
          <div className="text-xs text-green-600">+8% this week</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Average Rating</div>
            <div className="w-5 h-5 bg-pink-100 text-pink-600 rounded flex items-center justify-center text-xs">⭐</div>
          </div>
          <div className="text-xl font-semibold text-gray-900 mb-1">4.7</div>
          <div className="text-xs text-gray-600">Based on 23 reviews</div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </Link>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md transition-colors">
              <div className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded flex items-center justify-center text-xs">🚶</div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">#ORD-1847</div>
                <div className="text-xs text-gray-600">Emma L. • 5 min ago</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm text-gray-900">285 SEK</div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Pending</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md transition-colors">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">🚗</div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">#ORD-1846</div>
                <div className="text-xs text-gray-600">John D. • 12 min ago</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm text-gray-900">420 SEK</div>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Preparing</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md transition-colors">
              <div className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded flex items-center justify-center text-xs">🚶</div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">#ORD-1845</div>
                <div className="text-xs text-gray-600">Sarah K. • 18 min ago</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm text-gray-900">195 SEK</div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/orders/new" className="p-3 bg-gray-50 border border-gray-200 rounded-md text-center hover:bg-gray-100 transition-colors">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded mx-auto mb-2 flex items-center justify-center text-xs">➕</div>
                  <div className="text-xs font-medium text-gray-900">New Order</div>
                </Link>
                <Link href="/dashboard/menus" className="p-3 bg-gray-50 border border-gray-200 rounded-md text-center hover:bg-gray-100 transition-colors">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded mx-auto mb-2 flex items-center justify-center text-xs">🍽️</div>
                  <div className="text-xs font-medium text-gray-900">Edit Menu</div>
                </Link>
                <Link href="/dashboard/items" className="p-3 bg-gray-50 border border-gray-200 rounded-md text-center hover:bg-gray-100 transition-colors">
                  <div className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded mx-auto mb-2 flex items-center justify-center text-xs">🍕</div>
                  <div className="text-xs font-medium text-gray-900">Add Item</div>
                </Link>
                <Link href="/dashboard/settings" className="p-3 bg-gray-50 border border-gray-200 rounded-md text-center hover:bg-gray-100 transition-colors">
                  <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded mx-auto mb-2 flex items-center justify-center text-xs">⚙️</div>
                  <div className="text-xs font-medium text-gray-900">Settings</div>
                </Link>
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Today's Performance</h3>
              <Link href="/dashboard/analytics" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Full Analytics
              </Link>
            </div>
            <div className="p-4">
              <div className="h-24 bg-gradient-to-br from-blue-50 to-indigo-50 border border-dashed border-blue-200 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs text-blue-600 font-medium">📈 Revenue Chart</div>
                  <div className="text-xs text-blue-500">12,450 SEK today (+15% vs yesterday)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl">
            🎉
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Your Restaurant Dashboard!</h3>
            <p className="text-gray-700 mb-4">
              Get started by creating your first menu, adding items, and setting up your ordering widget. 
              Everything you need to run your restaurant is right here.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/menus" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                <Menu className="h-4 w-4" />
                Create Menu
              </Link>
              <Link href="/dashboard/widget" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-md border border-blue-200 hover:bg-blue-50 transition-colors">
                <LinkIcon className="h-4 w-4" />
                Setup Widget
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
