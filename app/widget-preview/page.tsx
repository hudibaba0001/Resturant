import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export default function WidgetPreviewPage() {
  // Use the real restaurant ID from our database
  const restaurantId = 'bc19346b-72fb-423e-a77d-36ae8ffe0d95'
  const restaurantName = 'Demo Bistro'

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Widget Preview</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">{restaurantName} - Website Demo</h2>
          <p className="text-gray-600 mb-4">
            This is a demo restaurant website. The widget should appear as a floating button in the bottom right corner.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">About Our Restaurant</h3>
              <p className="text-gray-600">
                Welcome to our amazing restaurant! We serve delicious food made with fresh, local ingredients.
                Our menu features a variety of options including vegetarian, vegan, and gluten-free dishes.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Opening Hours</h3>
              <ul className="text-gray-600 space-y-1">
                <li>Monday - Friday: 11:00 AM - 10:00 PM</li>
                <li>Saturday - Sunday: 12:00 PM - 11:00 PM</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Widget Features</h3>
          <ul className="text-blue-800 space-y-1">
            <li>• AI-powered menu recommendations</li>
            <li>• Real-time chat with menu assistant</li>
            <li>• Easy ordering with dine-in or pickup options</li>
            <li>• Allergen information and dietary preferences</li>
            <li>• Mobile-responsive design</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-100 rounded text-sm">
            <strong>Restaurant ID:</strong> {restaurantId}
          </div>
        </div>
      </div>
      
      {/* Widget will be loaded here */}
      <script 
        src="/widget.js" 
        data-restaurant={restaurantId}
        defer
      ></script>
    </div>
  );
}
