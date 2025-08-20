'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Search } from 'lucide-react'

type Section = {
  id: string
  name: string
  description: string | null
  position: number
}

type Item = {
  id: string
  name: string
  description: string | null
  price_cents: number | null
  currency: string
  category: string | null
  is_available: boolean
  allergens: string[] | null
}

type MenuManagerProps = {
  restaurantId: string
  userRole: string
  initialSections: Section[]
  initialItems: Item[]
}

export default function MenuManager({ 
  restaurantId, 
  userRole, 
  initialSections, 
  initialItems 
}: MenuManagerProps) {
  const [sections, setSections] = useState<Section[]>(initialSections)
  const [items, setItems] = useState<Item[]>(initialItems)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  const canEdit = userRole === 'editor' || userRole === 'manager' || userRole === 'owner'

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSection = selectedSection === 'all' || item.category === selectedSection
    return matchesSearch && matchesSection
  })

  const handleAddItem = () => {
    setEditingItem(null)
    setShowItemModal(true)
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setShowItemModal(true)
  }

  const handleSaveItem = async (itemData: Partial<Item>) => {
    // This would be a server action in a real implementation
    console.log('Saving item:', itemData)
    setShowItemModal(false)
  }

  return (
    <div className="mt-8">
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
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
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          aria-label="Filter by section"
        >
          <option value="all">All Sections</option>
          {sections.map(section => (
            <option key={section.id} value={section.name}>
              {section.name}
            </option>
          ))}
        </select>
        {canEdit && (
          <button
            onClick={handleAddItem}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredItems.map((item) => (
            <li key={item.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {item.name}
                        {!item.is_available && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Unavailable
                          </span>
                        )}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                        <span>{item.category || 'No section'}</span>
                        {item.price_cents && (
                          <span>{(item.price_cents / 100).toFixed(2)} {item.currency}</span>
                        )}
                        {item.allergens && item.allergens.length > 0 && (
                          <span>Allergens: {item.allergens.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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

      {/* Item Modal */}
      {showItemModal && (
        <ItemModal
          item={editingItem}
          sections={sections}
          onSave={handleSaveItem}
          onClose={() => setShowItemModal(false)}
        />
      )}
    </div>
  )
}

// Simple modal component (would be more sophisticated in production)
function ItemModal({ 
  item, 
  sections, 
  onSave, 
  onClose 
}: { 
  item: Item | null
  sections: Section[]
  onSave: (data: Partial<Item>) => void
  onClose: () => void 
}) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price_cents: item?.price_cents ? item.price_cents / 100 : '',
    currency: item?.currency || 'SEK',
    category: item?.category || '',
    is_available: item?.is_available ?? true,
    allergens: item?.allergens?.join(', ') || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      price_cents: formData.price_cents ? Math.round(Number(formData.price_cents) * 100) : null,
      allergens: formData.allergens ? formData.allergens.split(',').map(s => s.trim()).filter(Boolean) : null
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {item ? 'Edit Item' : 'Add Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_cents}
                  onChange={(e) => setFormData({...formData, price_cents: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
                             <div>
                 <label className="block text-sm font-medium text-gray-700">Currency</label>
                 <select
                   value={formData.currency}
                   onChange={(e) => setFormData({...formData, currency: e.target.value})}
                   className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                   aria-label="Select currency"
                 >
                   <option value="SEK">SEK</option>
                   <option value="USD">USD</option>
                   <option value="EUR">EUR</option>
                 </select>
               </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Section</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a section</option>
                {sections.map(section => (
                  <option key={section.id} value={section.name}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Allergens (comma-separated)</label>
              <input
                type="text"
                value={formData.allergens}
                onChange={(e) => setFormData({...formData, allergens: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., nuts, dairy, gluten"
              />
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
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {item ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
