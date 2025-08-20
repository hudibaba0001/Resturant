'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

interface MenuSection {
  id: string;
  name: string;
  position: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  tags: string[] | null;
  is_available: boolean;
  section_id: string | null;
}

interface MenuManagerProps {
  restaurantId: string;
  sections: MenuSection[];
  items: MenuItem[];
  userRole: string;
}

export default function MenuManager({ restaurantId, sections, items, userRole }: MenuManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_cents: 0,
    currency: 'SEK',
    tags: '',
    is_available: true,
    section_id: ''
  });

  const isReadOnly = userRole === 'viewer';

  // Filter items based on search and section
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSection = selectedSection === 'all' || item.section_id === selectedSection;
    return matchesSearch && matchesSection;
  });

  const handleAddItem = async () => {
    if (isReadOnly) return;
    
    try {
      const response = await fetch('/api/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({
          name: '',
          description: '',
          price_cents: 0,
          currency: 'SEK',
          tags: '',
          is_available: true,
          section_id: ''
        });
        // Refresh the page to get updated data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || isReadOnly) return;
    
    try {
      const response = await fetch(`/api/menu/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
        })
      });

      if (response.ok) {
        setEditingItem(null);
        setFormData({
          name: '',
          description: '',
          price_cents: 0,
          currency: 'SEK',
          tags: '',
          is_available: true,
          section_id: ''
        });
        // Refresh the page to get updated data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    if (isReadOnly) return;
    
    try {
      const response = await fetch(`/api/menu/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !currentStatus })
      });

      if (response.ok) {
        // Refresh the page to get updated data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price_cents: item.price_cents,
      currency: item.currency,
      tags: item.tags ? item.tags.join(', ') : '',
      is_available: item.is_available,
      section_id: item.section_id || ''
    });
  };

  const formatPrice = (cents: number, currency: string) => {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            aria-label="Filter by section"
          >
            <option value="all">All Sections</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </select>
          
          {!isReadOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredItems.map((item) => (
            <li key={item.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                    {!item.is_available && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Unavailable
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                  )}
                  <div className="mt-2 flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(item.price_cents, item.currency)}
                    </span>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex space-x-1">
                        {item.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-sm text-gray-500">
                      {sections.find(s => s.id === item.section_id)?.name || 'No section'}
                    </span>
                  </div>
                </div>
                
                {!isReadOnly && (
                  <div className="flex items-center space-x-2">
                                         <button
                       onClick={() => handleToggleAvailability(item.id, item.is_available)}
                       className="text-gray-400 hover:text-gray-600"
                       aria-label={item.is_available ? 'Make unavailable' : 'Make available'}
                     >
                       {item.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                     </button>
                     <button
                       onClick={() => openEditModal(item)}
                       className="text-gray-400 hover:text-gray-600"
                       aria-label="Edit item"
                     >
                       <Edit className="h-4 w-4" />
                     </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No items found.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price (cents)</label>
                    <input
                      type="number"
                      value={formData.price_cents}
                      onChange={(e) => setFormData({...formData, price_cents: parseInt(e.target.value) || 0})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                                     <div>
                     <label className="block text-sm font-medium text-gray-700">Currency</label>
                     <select
                       value={formData.currency}
                       onChange={(e) => setFormData({...formData, currency: e.target.value})}
                       className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                       aria-label="Select currency"
                     >
                       <option value="SEK">SEK</option>
                       <option value="USD">USD</option>
                       <option value="EUR">EUR</option>
                     </select>
                   </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="vegan, gluten-free, spicy"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Section</label>
                  <select
                    value={formData.section_id}
                    onChange={(e) => setFormData({...formData, section_id: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No section</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({...formData, is_available: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Available</label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    setFormData({
                      name: '',
                      description: '',
                      price_cents: 0,
                      currency: 'SEK',
                      tags: '',
                      is_available: true,
                      section_id: ''
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingItem ? handleEditItem : handleAddItem}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {editingItem ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
