'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, FolderOpen, Edit2 } from 'lucide-react';

export type Section = {
  id: string;
  menu_id: string;
  parent_id: string | null;
  path: string[];
  name: string;
  description: string | null;
  sort_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  restaurantId: string;
  currentMenuSlug: string;
  selectedSection?: string;
  onSectionSelect?: (sectionName: string) => void;
};

export function SectionManager({ restaurantId, currentMenuSlug, selectedSection, onSectionSelect }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const router = useRouter();

  // Load sections
  const loadSections = useCallback(async () => {
    try {
      const res = await fetch(`/dashboard/proxy/menus/sections?restaurant_id=${restaurantId}`);
      if (!res.ok) throw new Error('Failed to load sections');
      
      const text = await res.text();
      const data = text && res.headers.get('content-type')?.includes('application/json')
        ? JSON.parse(text)
        : null;
      if (data?.sections) {
        setSections(data.sections as Section[]);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
      setError('Failed to load sections');
    }
  }, [restaurantId]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  async function addSection() {
    if (!newSectionName.trim()) {
      setError('Please enter a name.');
      return;
    }
    
    setBusy(true);
    setError('');
    
    try {
      const res = await fetch('/dashboard/proxy/menus/sections', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          name: newSectionName.trim(),
        }),
      });

      const text = await res.text();
      const data = text && res.headers.get('content-type')?.includes('application/json')
        ? JSON.parse(text)
        : null;
      
      if (!res.ok) {
        if (data?.code === 'INVALID_INPUT') {
          setError('Please enter a name.');
        } else if (data?.code === 'ALREADY_EXISTS') {
          setError('Section already exists.');
        } else if (data?.code === 'DB_ERROR') {
          setError('Database error: ' + (data.error || 'Unknown error'));
        } else {
          setError('Failed to create section: ' + (data?.code || 'Unknown error'));
        }
        return;
      }

      // Success - clear form and reload
      setNewSectionName('');
      await loadSections();
      router.refresh();
      
    } catch (err) {
      setError('Failed to create section');
      console.error('Section creation error:', err);
    } finally {
      setBusy(false);
    }
  }

  async function renameSection(sectionId: string, newName: string) {
    if (!newName.trim()) {
      setError('Please enter a name.');
      return;
    }
    
    setBusy(true);
    setError('');
    
    try {
      const res = await fetch(`/dashboard/proxy/menus/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: newName.trim(),
        }),
      });

      const text = await res.text();
      const data = text && res.headers.get('content-type')?.includes('application/json')
        ? JSON.parse(text)
        : null;
      
      if (!res.ok) {
        if (data?.code === 'INVALID_INPUT') {
          setError('Please enter a name.');
        } else if (data?.code === 'ALREADY_EXISTS') {
          setError('Section already exists.');
        } else if (data?.code === 'NOT_FOUND') {
          setError('Section not found. Refresh?');
        } else {
          setError('Failed to rename section: ' + (data?.code || 'Unknown error'));
        }
        return;
      }

      // Success - clear edit state and reload
      setEditingSection(null);
      setEditName('');
      await loadSections();
      router.refresh();
      
    } catch (err) {
      setError('Failed to rename section');
      console.error('Section rename error:', err);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSection(sectionId: string, sectionName: string) {
    if (!confirm(`Delete section "${sectionName}"? All items will be moved to General.`)) return;
    
    setBusy(true);
    setError('');
    
    try {
      const res = await fetch(`/dashboard/proxy/menus/sections/${sectionId}`, {
        method: 'DELETE'
      });

      const text = await res.text();
      const data = text && res.headers.get('content-type')?.includes('application/json')
        ? JSON.parse(text)
        : null;

      if (!res.ok) {
        if (data?.code === 'NOT_FOUND') {
          setError('Section not found. Refresh?');
        } else {
          setError('Failed to delete section: ' + (data?.error || 'Unknown error'));
        }
        return;
      }

      await loadSections();
      router.refresh();
      
      // If this was the selected section, clear selection
      if (selectedSection === sectionName) {
        onSectionSelect?.('');
      }
      
    } catch (err) {
      setError('Failed to delete section');
      console.error('Section deletion error:', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Section Input and Add Button */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Enter section name..."
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
            disabled={busy}
            className="flex-1"
          />
          <Button 
            onClick={addSection} 
            disabled={busy || !newSectionName.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {busy ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add Section
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div 
            key={section.id}
            className={`group bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              selectedSection === section.name 
                ? 'border-blue-300 bg-blue-50 shadow-sm' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
            onClick={() => onSectionSelect?.(section.name)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                  selectedSection === section.name 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  {editingSection === section.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameSection(section.id, editName);
                        } else if (e.key === 'Escape') {
                          setEditingSection(null);
                          setEditName('');
                        }
                      }}
                      onBlur={() => {
                        if (editName.trim()) {
                          renameSection(section.id, editName);
                        } else {
                          setEditingSection(null);
                          setEditName('');
                        }
                      }}
                      autoFocus
                      className="h-8 text-sm"
                      disabled={busy}
                    />
                  ) : (
                    <div className={`font-medium ${
                      selectedSection === section.name ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {section.name}
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
                    {section.path.length > 0 ? section.path.join(' / ') : 'General'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSection(section.id);
                    setEditName(section.name);
                  }}
                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  disabled={busy}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSection(section.id, section.name);
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {sections.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FolderOpen className="h-6 w-6 text-gray-400" />
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">No sections yet</div>
            <div className="text-xs text-gray-500">Create your first section above to organize your menu</div>
          </div>
        )}
      </div>

      {/* General Section (always available) */}
      <div 
        className={`group bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          !selectedSection 
            ? 'border-blue-300 bg-blue-50 shadow-sm' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }`}
        onClick={() => onSectionSelect?.('')}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
            !selectedSection 
              ? 'bg-blue-100 text-blue-600' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            <FolderOpen className="h-4 w-4" />
          </div>
          <div>
            <div className={`font-medium ${
              !selectedSection ? 'text-blue-900' : 'text-gray-900'
            }`}>
              General
            </div>
            <div className="text-sm text-gray-500">No section assigned</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SectionManager;
