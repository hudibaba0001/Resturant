'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  useEffect(() => {
    loadSections();
  }, [restaurantId, currentMenuSlug]);

  async function loadSections() {
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
  }

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
    <div className="space-y-4">
      {/* Section Input and Add Button */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Section name"
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSection()}
          disabled={busy}
        />
        <Button 
          onClick={addSection} 
          disabled={busy || !newSectionName.trim()}
          size="sm"
        >
          {busy ? 'Adding...' : '+ Add'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {/* Sections List */}
      <div className="space-y-2">
        {sections.map((section) => (
          <div 
            key={section.name}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedSection === section.name 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => onSectionSelect?.(section.name)}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{section.name}</span>
              <span className="text-sm text-gray-500">
                {section.itemCount} item{section.itemCount !== 1 ? 's' : ''}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                deleteSection(section.name);
              }}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              ✕
            </Button>
          </div>
        ))}
        
        {sections.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-4">
            No sections yet. Create one above!
          </div>
        )}
      </div>

      {/* General Section (always available) */}
      <div 
        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
          !selectedSection 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
        onClick={() => onSectionSelect?.('')}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">General</span>
          <span className="text-sm text-gray-500">No section</span>
        </div>
      </div>
    </div>
  );
}

export default SectionManager;
