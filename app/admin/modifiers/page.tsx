'use client';

import { useState, useEffect } from 'react';

type ModifierGroup = {
  id: string;
  name: string;
  selection_type: 'single' | 'multiple';
  max_select: number | null;
  required: boolean;
  created_at: string;
  updated_at: string;
};

type ModifierOption = {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  created_at: string;
  updated_at: string;
};

export default function AdminModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [options, setOptions] = useState<ModifierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch modifier groups
  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/modifier-groups?limit=100', {
        method: 'GET',
        cache: 'no-store',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Failed to fetch groups: ${response.status}`);
      }

      setGroups(data.data || data || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
      setGroups([]);
    }
  };

  // Fetch options for selected group
  const fetchOptions = async (groupId: string) => {
    try {
      const response = await fetch(`/api/modifier-options?group_id=${groupId}`, {
        method: 'GET',
        cache: 'no-store',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Failed to fetch options: ${response.status}`);
      }

      setOptions(data.data || data || []);
    } catch (err) {
      console.error('Failed to fetch options:', err);
      setOptions([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      await fetchGroups();
      setLoading(false);
    };
    loadData();
  }, []);

  // Load options when group is selected
  useEffect(() => {
    if (selectedGroupId) {
      fetchOptions(selectedGroupId);
    } else {
      setOptions([]);
    }
  }, [selectedGroupId]);

  // Create new group
  const handleCreateGroup = async (groupData: Omit<ModifierGroup, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/modifier-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Create failed: ${response.status}`);
      }

      const newGroup = data.data || data;
      setGroups(prev => [newGroup, ...prev]);
      setSelectedGroupId(newGroup.id);
      console.log('✅ Group created successfully');
    } catch (err) {
      console.error('❌ Create group failed:', err);
      alert(`Create failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Update group
  const handleUpdateGroup = async (groupId: string, updates: Partial<ModifierGroup>) => {
    try {
      const response = await fetch(`/api/modifier-groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Update failed: ${response.status}`);
      }

      setGroups(prev => prev.map(group => 
        group.id === groupId ? { ...group, ...updates } : group
      ));
      setEditingGroupId(null);
      console.log('✅ Group updated successfully');
    } catch (err) {
      console.error('❌ Update group failed:', err);
      alert(`Update failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? This will also delete all its options.')) {
      return;
    }

    setDeletingId(groupId);
    
    try {
      const response = await fetch(`/api/modifier-groups/${groupId}`, {
        method: 'DELETE',
      });

      if (response.status === 204 || response.ok) {
        setGroups(prev => prev.filter(group => group.id !== groupId));
        if (selectedGroupId === groupId) {
          setSelectedGroupId(null);
        }
        console.log('✅ Group deleted successfully');
      } else {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorText}`);
      }
    } catch (err) {
      console.error('❌ Delete group failed:', err);
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Create option
  const handleCreateOption = async (optionData: Omit<ModifierOption, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/modifier-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optionData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Create failed: ${response.status}`);
      }

      const newOption = data.data || data;
      setOptions(prev => [newOption, ...prev]);
      console.log('✅ Option created successfully');
    } catch (err) {
      console.error('❌ Create option failed:', err);
      alert(`Create failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Delete option
  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Are you sure you want to delete this option?')) {
      return;
    }

    try {
      const response = await fetch(`/api/modifier-options/${optionId}`, {
        method: 'DELETE',
      });

      if (response.status === 204 || response.ok) {
        setOptions(prev => prev.filter(option => option.id !== optionId));
        console.log('✅ Option deleted successfully');
      } else {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorText}`);
      }
    } catch (err) {
      console.error('❌ Delete option failed:', err);
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading modifier groups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-red-700">
            <strong>Error loading groups:</strong> {error}
          </div>
          <button
            onClick={fetchGroups}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modifier Groups & Options</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchGroups}
            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
          >
            Refresh
          </button>
          <span className="text-sm text-gray-600 self-center">
            {groups.length} groups
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Groups */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Modifier Groups</h2>
          
          {/* Create Group Form */}
          <CreateGroupForm onCreateGroup={handleCreateGroup} />
          
          {/* Groups List */}
          <div className="space-y-3">
            {groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No modifier groups found.</p>
                <p className="text-sm">Create your first group above.</p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className={`border rounded-lg p-4 transition-all ${
                    selectedGroupId === group.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{group.name}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        {group.selection_type === 'single' ? 'Single choice' : 'Multiple choice'}
                        {group.max_select && ` (max ${group.max_select})`}
                        {group.required && ' • Required'}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
                      >
                        {selectedGroupId === group.id ? 'Close' : 'Select'}
                      </button>
                      
                      <button
                        onClick={() => setEditingGroupId(editingGroupId === group.id ? null : group.id)}
                        className="px-3 py-1 text-sm bg-yellow-600 text-white hover:bg-yellow-700 rounded"
                      >
                        {editingGroupId === group.id ? 'Cancel' : 'Edit'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={deletingId === group.id}
                        className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded disabled:opacity-50"
                      >
                        {deletingId === group.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  {/* Edit Group Form */}
                  {editingGroupId === group.id && (
                    <EditGroupForm
                      group={group}
                      onSave={(updates) => handleUpdateGroup(group.id, updates)}
                      onCancel={() => setEditingGroupId(null)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Options */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Options {selectedGroupId && `(${options.length})`}
          </h2>
          
          {selectedGroupId ? (
            <>
              {/* Create Option Form */}
              <CreateOptionForm 
                groupId={selectedGroupId} 
                onCreateOption={handleCreateOption} 
              />
              
              {/* Options List */}
              <div className="space-y-3">
                {options.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No options found.</p>
                    <p className="text-sm">Add options to this group above.</p>
                  </div>
                ) : (
                  options.map((option) => (
                    <div
                      key={option.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{option.name}</h4>
                          <div className="text-sm text-gray-600">
                            Price delta: {option.price_delta > 0 ? '+' : ''}{(option.price_delta / 100).toFixed(2)} SEK
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteOption(option.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Select a modifier group to manage its options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Create Group Form Component
function CreateGroupForm({ onCreateGroup }: { onCreateGroup: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    selection_type: 'single' as 'single' | 'multiple',
    max_select: '',
    required: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const groupData = {
      name: formData.name.trim(),
      selection_type: formData.selection_type,
      max_select: formData.selection_type === 'multiple' ? parseInt(formData.max_select) || null : null,
      required: formData.required,
    };

    onCreateGroup(groupData);
    
    // Reset form
    setFormData({
      name: '',
      selection_type: 'single',
      max_select: '',
      required: false,
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Create New Group</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Group Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            placeholder="e.g., Choose Size"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Selection Type
            </label>
            <select
              value={formData.selection_type}
              onChange={(e) => setFormData(prev => ({ ...prev, selection_type: e.target.value as 'single' | 'multiple' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              <option value="single">Single Choice</option>
              <option value="multiple">Multiple Choice</option>
            </select>
          </div>
          
          {formData.selection_type === 'multiple' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Max Selections
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_select}
                onChange={(e) => setFormData(prev => ({ ...prev, max_select: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                placeholder="3"
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.required}
              onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
              className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-900 font-medium">Required</span>
          </label>
        </div>
        
        <button
          type="submit"
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          Save Group
        </button>
      </form>
    </div>
  );
}

// Edit Group Form Component
function EditGroupForm({ 
  group, 
  onSave, 
  onCancel 
}: { 
  group: ModifierGroup; 
  onSave: (updates: Partial<ModifierGroup>) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: group.name,
    selection_type: group.selection_type,
    max_select: group.max_select?.toString() || '',
    required: group.required,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates = {
      name: formData.name.trim(),
      selection_type: formData.selection_type,
      max_select: formData.selection_type === 'multiple' ? parseInt(formData.max_select) || null : null,
      required: formData.required,
    };

    onSave(updates);
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 bg-yellow-50 rounded-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Group Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Selection Type
            </label>
            <select
              value={formData.selection_type}
              onChange={(e) => setFormData(prev => ({ ...prev, selection_type: e.target.value as 'single' | 'multiple' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              <option value="single">Single Choice</option>
              <option value="multiple">Multiple Choice</option>
            </select>
          </div>
          
          {formData.selection_type === 'multiple' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Max Selections
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_select}
                onChange={(e) => setFormData(prev => ({ ...prev, max_select: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.required}
              onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
              className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-900 font-medium">Required</span>
          </label>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Create Option Form Component
function CreateOptionForm({ 
  groupId, 
  onCreateOption 
}: { 
  groupId: string; 
  onCreateOption: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    price_delta: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const optionData = {
      group_id: groupId,
      name: formData.name.trim(),
      price_delta: Math.round(Number(formData.price_delta) * 100), // Convert to cents
    };

    onCreateOption(optionData);
    
    // Reset form
    setFormData({
      name: '',
      price_delta: '',
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Add Option</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Option Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            placeholder="e.g., Large"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Price Delta (SEK)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price_delta}
            onChange={(e) => setFormData(prev => ({ ...prev, price_delta: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            placeholder="2.00"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          Add Option
        </button>
      </form>
    </div>
  );
}
