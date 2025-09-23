'use client';

import { useState, useEffect } from 'react';

type Item = {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  is_available: boolean;
  section_path?: string[];
  section_id?: string;
  image_url?: string;
  variant_groups?: any[];
  modifier_groups?: any[];
  tags?: string[];
  details?: Record<string, any>;
};

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch items
  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/dashboard/proxy/items?limit=100', {
        method: 'GET',
        cache: 'no-store',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Failed to fetch items: ${response.status}`);
      }

      setItems(data.data || data || []);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Update item
  const handleUpdate = async (id: string, updates: Partial<Item>) => {
    try {
      const response = await fetch(`/dashboard/proxy/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Update failed: ${response.status}`);
      }

      // Update local state
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      
      setEditingId(null);
      console.log('✅ Item updated successfully');
    } catch (err) {
      console.error('❌ Update failed:', err);
      alert(`Update failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Delete item
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    
    try {
      const response = await fetch(`/dashboard/proxy/items/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 204 || response.ok) {
        // Remove from local state
        setItems(prev => prev.filter(item => item.id !== id));
        console.log('✅ Item deleted successfully');
      } else {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorText}`);
      }
    } catch (err) {
      console.error('❌ Delete failed:', err);
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-red-700">
            <strong>Error loading items:</strong> {error}
          </div>
          <button
            onClick={fetchItems}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menu Items Admin</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchItems}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Refresh
          </button>
          <span className="text-sm text-gray-500 self-center">
            {items.length} items
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No items found.</p>
            <p className="text-sm">Add items through the dashboard to see them here.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              {/* Item Header */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-gray-900">
                      {(item.price / 100).toFixed(2)} {item.currency}
                    </span>
                    {item.section_path && item.section_path.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {item.section_path.join(' / ')}
                      </span>
                    )}
                    {!item.is_available && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                  >
                    {expandedId === item.id ? 'Close' : 'Open'}
                  </button>
                  
                  <button
                    onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                    className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded"
                  >
                    {editingId === item.id ? 'Cancel' : 'Edit'}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded disabled:opacity-50"
                  >
                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === item.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                      <div className="space-y-1 text-sm">
                        <div><strong>ID:</strong> {item.id}</div>
                        <div><strong>Description:</strong> {item.description || 'None'}</div>
                        <div><strong>Available:</strong> {item.is_available ? 'Yes' : 'No'}</div>
                        {item.image_url && (
                          <div><strong>Image:</strong> <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Metadata</h4>
                      <div className="space-y-1 text-sm">
                        {item.tags && item.tags.length > 0 && (
                          <div><strong>Tags:</strong> {item.tags.join(', ')}</div>
                        )}
                        {item.variant_groups && item.variant_groups.length > 0 && (
                          <div><strong>Variants:</strong> {item.variant_groups.length} groups</div>
                        )}
                        {item.modifier_groups && item.modifier_groups.length > 0 && (
                          <div><strong>Modifiers:</strong> {item.modifier_groups.length} groups</div>
                        )}
                        {item.details && Object.keys(item.details).length > 0 && (
                          <div><strong>Details:</strong> {Object.keys(item.details).length} fields</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Form */}
              {editingId === item.id && (
                <EditForm
                  item={item}
                  onSave={(updates) => handleUpdate(item.id, updates)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Inline Edit Form Component
function EditForm({ 
  item, 
  onSave, 
  onCancel 
}: { 
  item: Item; 
  onSave: (updates: Partial<Item>) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: item.name,
    description: item.description || '',
    price: (item.price / 100).toFixed(2), // Convert cents to dollars
    currency: item.currency,
    is_available: item.is_available,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: Partial<Item> = {
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      price: Math.round(Number(formData.price) * 100), // Convert to cents
      currency: formData.currency,
      is_available: formData.is_available,
    };

    onSave(updates);
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SEK">SEK</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_available}
              onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Available for ordering</span>
          </label>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
