'use client';

import { useState, useEffect, useCallback } from 'react';
import { MenuItemsList } from '@/components/dashboard/MenuItemsList';

type Item = {
  id: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  section_path: string[];
  section_id?: string | null;
  is_available?: boolean;
  image_url?: string | null;
  variant_groups?: any[];
  modifier_groups?: any[];
  tags?: string[];
  details?: Record<string, any>;
};

type ItemsClientProps = {
  restaurantId: string;
  menu: string;
  sectionPath?: string[];
};

export default function ItemsClient({ 
  restaurantId, 
  menu, 
  sectionPath = [] 
}: ItemsClientProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        restaurantId,
        menu,
        limit: '100',
      });

      // Add section filter if provided
      if (sectionPath.length > 0 && sectionPath[0]) {
        params.append('section', sectionPath[0]);
      }

      const response = await fetch(`/dashboard/proxy/items?${params}`, {
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
  }, [restaurantId, menu, sectionPath]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleItemsChanged = () => {
    console.log('🔄 Items changed, refreshing...');
    fetchItems();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading items...</div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Menu Items ({items.length})
        </h3>
        <button
          onClick={fetchItems}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Refresh
        </button>
      </div>

      <MenuItemsList
        items={items}
        restaurantId={restaurantId}
        menu={menu}
        sectionPath={sectionPath}
        onChanged={handleItemsChanged}
      />
    </div>
  );
}
