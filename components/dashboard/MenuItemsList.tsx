'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ItemEditor } from '@/components/dashboard/ItemEditor';
import { Trash2, Edit } from 'lucide-react';

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

type MenuItemsListProps = {
  items: Item[];
  restaurantId: string;
  menu: string;
  sectionPath?: string[];
  onChanged?: () => void;
};

export function MenuItemsList({ 
  items, 
  restaurantId, 
  menu, 
  sectionPath = [],
  onChanged 
}: MenuItemsListProps) {
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatPrice = (cents: number, currency: string) => {
    const amount = cents / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    setDeletingId(itemId);
    
    try {
      const response = await fetch(`/dashboard/proxy/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.status === 204) {
        console.log('✅ Item deleted successfully');
        onChanged?.();
      } else {
        const errorText = await response.text();
        console.error('❌ Delete failed:', response.status, errorText);
        alert(`Delete failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSave = (itemId: string) => {
    console.log('✅ Item edited successfully:', itemId);
    setEditingItem(null);
    onChanged?.();
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No items found.</p>
        <p className="text-sm">Add your first item to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(item.price_cents, item.currency)}
                    </span>
                    {item.section_path && item.section_path.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {item.section_path.join(' / ')}
                      </span>
                    )}
                    {item.is_available === false && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
                
                {item.image_url && (
                  <div className="w-16 h-16 flex-shrink-0">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(item)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(item.id)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={deletingId === item.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <ItemEditor
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          restaurantId={restaurantId}
          menu={menu}
          sectionPath={sectionPath}
          sectionId={editingItem.section_id || undefined}
          initialItem={{
            id: editingItem.id,
            restaurantId,
            menu,
            name: editingItem.name,
            price_cents: editingItem.price_cents,
            currency: editingItem.currency,
            section_path: editingItem.section_path,
            ...(editingItem.section_id && { section_id: editingItem.section_id }),
            description: editingItem.description || '',
            image_url: editingItem.image_url || '',
            is_available: editingItem.is_available ?? true,
            variant_groups: editingItem.variant_groups || [],
            modifier_groups: editingItem.modifier_groups || [],
            tags: editingItem.tags || [],
            details: editingItem.details || {},
          }}
          onSaved={handleEditSave}
        />
      )}
    </>
  );
}
