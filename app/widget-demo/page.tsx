import { getSupabaseServer } from '@/lib/supabaseServer';
import WidgetLoader from './WidgetLoader';

export default async function WidgetDemoPage() {
  const supabase = getSupabaseServer();
  
  // Get a sample restaurant for demo
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, is_active')
    .eq('is_active', true)
    .limit(1);

  const demoRestaurant = restaurants?.[0];

  if (!demoRestaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Active Restaurants</h1>
          <p className="text-gray-600">Please activate a restaurant first to test the widget.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🍽️ Stjarna Widget Demo</h1>
              <p className="text-gray-600 mt-2">Data Spine + AI Chat + Smart Cart</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Restaurant ID</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">{demoRestaurant.id}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - Demo Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 New Features</h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-medium text-gray-900">Cache-First Chat</h3>
                    <p className="text-sm text-gray-600">Menu-based responses with intelligent caching</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-medium text-gray-900">Session Persistence</h3>
                    <p className="text-sm text-gray-600">Stable chat threads across browser sessions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-medium text-gray-900">Analytics Tracking</h3>
                    <p className="text-sm text-gray-600">Complete event tracking for insights</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-medium text-gray-900">Security Hardening</h3>
                    <p className="text-sm text-gray-600">Origin allowlist, server-side validation</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🧪 Test Commands</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Try asking:</p>
                                     <ul className="text-sm text-gray-600 space-y-1">
                     <li>• &ldquo;Italian dishes?&rdquo;</li>
                     <li>• &ldquo;Vegan options?&rdquo;</li>
                     <li>• &ldquo;What&apos;s popular?&rdquo;</li>
                     <li>• &ldquo;Budget options?&rdquo;</li>
                     <li>• &ldquo;Spicy food?&rdquo;</li>
                   </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Data Spine</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• <strong>Widget Sessions:</strong> Track user interactions</p>
                <p>• <strong>Chat Messages:</strong> Persistent conversation history</p>
                <p>• <strong>Response Cache:</strong> Fast, cached AI responses</p>
                <p>• <strong>Menu Snapshots:</strong> Version control for menu changes</p>
                <p>• <strong>Event Analytics:</strong> Complete user journey tracking</p>
              </div>
            </div>
          </div>

          {/* Right Column - Widget Preview */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 Widget Preview</h2>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300 min-h-[400px] relative">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🍽️</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Widget Loading...</h3>
                <p className="text-sm text-gray-600 mb-4">
                  The Stjarna widget should appear in the bottom-right corner
                </p>
                <div className="space-y-2 text-xs text-gray-500">
                  <p>✅ Cache-first chat responses</p>
                  <p>✅ Session persistence enabled</p>
                  <p>✅ Analytics tracking active</p>
                  <p>✅ Security validation running</p>
                </div>
              </div>
              
              {/* Widget should appear here */}
              <div className="absolute bottom-4 right-4">
                <div className="text-xs text-gray-400">
                  Widget button should appear here →
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">🔧 Integration Code</h3>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-xs text-green-400">
                  {`<script src="https://resturant-git-feat-data-spine-lovedeep-singhs-projects-96b003a8.vercel.app/widget.js" 
  data-restaurant="${demoRestaurant.id}"></script>`}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Technical Details */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🔬 Technical Implementation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Database Schema</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• widget_sessions</li>
                <li>• chat_messages</li>
                <li>• chat_response_cache</li>
                <li>• menu_snapshots</li>
                <li>• widget_events</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">API Endpoints</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• /api/chat (Edge Runtime)</li>
                <li>• /api/public/menu</li>
                <li>• /api/orders</li>
                <li>• /api/admin/rollup/daily</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Security Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Origin allowlist validation</li>
                <li>• Server-side price authority</li>
                <li>• CORS headers</li>
                <li>• RLS policies</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Loader */}
      <WidgetLoader restaurantId={demoRestaurant.id} />
    </div>
  );
}
