'use client';

export default function AdminModifiersPage() {
  return (
    <div className="min-h-screen bg-white p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modifier Groups & Options</h1>
      </div>

      <div className="text-center py-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Coming Soon</h2>
          <p className="text-blue-700 mb-4">
            Modifier groups and options management will be available soon.
          </p>
          <p className="text-sm text-blue-600">
            For now, you can manage menu items with variants and modifiers directly in the item editor.
          </p>
          <div className="mt-6">
            <a 
              href="/admin/items" 
              className="inline-block px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Manage Menu Items
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
