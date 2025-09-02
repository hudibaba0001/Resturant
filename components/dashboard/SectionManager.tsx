'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, FolderOpen } from 'lucide-react';

type Section = {
  name: string;
  itemCount: number;
  isActive: boolean;
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
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Load sections
  const loadSections = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/sections?restaurantId=${restaurantId}&menu=${currentMenuSlug}`);
      if (!res.ok) throw new Error('Failed to load sections');
      
      const data = await res.json();
      if (data.ok) {
        setSections(data.data);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  }, [restaurantId, currentMenuSlug]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  async function addSection() {
    if (!newSectionName.trim()) return;
    
    setBusy(true);
    setError('');
    
    try {
      const res = await fetch('/api/dashboard/sections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          menu: currentMenuSlug,
          name: newSectionName.trim(),
          description: `Section for ${newSectionName.trim()}`,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.code === 'SECTION_EXISTS') {
          setError('Section already exists');
        } else {
          setError('Failed to create section');
        }
        return;
      }

      // Success - clear form and reload
      setNewSectionName('');
      setIsAddingSection(false);
      await loadSections();
      router.refresh();
      
    } catch (err) {
      setError('Failed to create section');
      console.error('Section creation error:', err);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSection(sectionName: string) {
    if (!confirm(`Delete section "${sectionName}"? All items will be moved to General.`)) return;
    
    try {
      // Find the section placeholder item
      const sectionItem = sections.find(s => s.name === sectionName);
      if (!sectionItem) return;

      const res = await fetch(`/api/dashboard/sections/${sectionItem.name}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        alert('Failed to delete section');
        return;
      }

      await loadSections();
      router.refresh();
      
      // If this was the selected section, clear selection
      if (selectedSection === sectionName) {
        onSectionSelect?.('');
      }
      
    } catch (err) {
      alert('Failed to delete section');
      console.error('Section deletion error:', err);
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
            key={section.name}
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
                  <div className={`font-medium ${
                    selectedSection === section.name ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {section.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {section.itemCount} item{section.itemCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSection(section.name);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
