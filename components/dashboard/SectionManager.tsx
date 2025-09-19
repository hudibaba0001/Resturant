'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, FolderOpen, Edit2, Pencil, Check, X } from 'lucide-react';
import AddItemClient from '@/components/dashboard/AddItemClient';
import ItemsPanel from '@/components/dashboard/items/ItemsPanel';

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

function SectionRow({
  section,
  active,
  onRename,
  onDelete,
  onSelect,
  busy,
  restaurantId,
  menuId,
}: {
  section: Section;
  active: boolean;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
  onSelect: (name: string) => void;
  busy: boolean;
  restaurantId: string;
  menuId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(section.name);

  async function save() {
    if (!value.trim() || value.trim() === section.name) {
      setEditing(false);
      return;
    }
    await onRename(section.id, value.trim());
    setEditing(false);
  }

  function cancel() {
    setValue(section.name);
    setEditing(false);
  }

  return (
    <div
      className={[
        "group relative flex items-center justify-between rounded-md border px-3 py-2",
        active ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white",
      ].join(" ")}
      onClick={() => onSelect(section.name)}
    >
      {/* Left: name / editor */}
      <div className="min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              disabled={busy}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              onBlur={cancel}
              placeholder="Section name"
              aria-label="Section name"
              className="w-56 rounded-md border border-slate-300 px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={save}
              disabled={busy}
              title="Save"
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancel}
              title="Cancel"
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="truncate font-medium text-slate-900">{section.name}</div>
            <div className="truncate text-xs text-slate-500">
              {section.path?.join(" › ") || section.name}
            </div>
          </>
        )}
      </div>

      {/* Right: actions (visible on hover; always visible on touch) */}
      <div
        className="
          flex items-center gap-1
          opacity-0 transition-opacity
          group-hover:opacity-100
          [@media(pointer:coarse)]:opacity-100
        "
        onClick={(e) => e.stopPropagation()}
      >
        {!editing && (
          <>
            <AddItemClient
              restaurantId={restaurantId}
              menuId={menuId}
              sectionPath={[section.name]}
            />
            <button
              title="Rename section"
              onClick={() => setEditing(true)}
              disabled={busy}
              className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"
            >
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </button>
            <button
              title="Delete section"
              onClick={() => onDelete(section.id, section.name)}
              disabled={busy}
              className="inline-flex items-center rounded-md border border-rose-300 px-2 py-1 text-sm text-rose-600 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

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

      // Success - reload sections
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
        if (res.status === 409 && data?.code === 'HAS_ITEMS') {
          setError(`Can't delete: ${data.count ?? "Some"} item(s) are still in this section. Move them first.`);
          return;
        }
        if (res.status === 409 && data?.code === 'PROTECTED_SECTION') {
          setError(`The "General" section cannot be deleted.`);
          return;
        }
        if (data?.code === 'NOT_FOUND') {
          setError('Section not found. Refresh?');
        } else {
          setError(data?.code || `Delete failed (${res.status}).`);
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
            className="flex-1 rounded-md border px-3 py-2"
          />
          <Button 
            onClick={addSection} 
            disabled={busy || !newSectionName.trim()}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
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
      <div className="space-y-2">
        {sections.map((section) => (
          <SectionRow
            key={section.id}
            section={section}
            active={selectedSection === section.name}
            onSelect={(name) => onSectionSelect?.(name)}
            onRename={async (id, name) => {
              await renameSection(id, name);
            }}
            onDelete={async (id, name) => {
              await deleteSection(id, name);
            }}
            busy={busy}
            restaurantId={restaurantId}
            menuId={currentMenuSlug}
          />
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
        className={[
          "group relative flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer",
          !selectedSection 
            ? "border-emerald-400 bg-emerald-50" 
            : "border-slate-200 bg-white"
        ].join(" ")}
        onClick={() => onSectionSelect?.('')}
      >
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-900">General</div>
          <div className="truncate text-xs text-slate-500">No section assigned</div>
          </div>
        <div
          className="
            flex items-center gap-1
            opacity-0 transition-opacity
            group-hover:opacity-100
            [@media(pointer:coarse)]:opacity-100
          "
          onClick={(e) => e.stopPropagation()}
        >
          <AddItemClient
            restaurantId={restaurantId}
            menuId={currentMenuSlug}
            sectionPath={['General']}
          />
          </div>
        </div>

      {/* Items panel for currently selected section */}
      <div className="">
        <ItemsPanel
          restaurantId={restaurantId}
          menu={currentMenuSlug}
          section={selectedSection && selectedSection.length ? selectedSection : 'General'}
        />
      </div>
    </div>
  );
}

export default SectionManager;
