'use client';

import { MenuRepository } from '@/lib/menuRepo';
import { getServerSupabase } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Suspense, useEffect, useState } from 'react';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import type { Item } from '@/lib/types/menu';
import AddItemClient from '@/components/dashboard/AddItemClient';
import { ItemRowClient } from './ItemRowClient';
import SectionManager from '@/components/dashboard/SectionManager';
import Link from 'next/link';

export default function MenuEditorPage({ params }: { params: { menuId: string } }) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        // Get restaurant ID
        const supabase = getServerSupabase();
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        
        if (restaurantData?.id) {
          setRestaurantId(restaurantData.id);
          
          // Load sections and items
          const repo = new MenuRepository('persistent');
          const sectionsData = await repo.listSections(restaurantData.id, params.menuId);
          setSections(sectionsData);
          
          const firstSection = sectionsData.find((s: any) => s.path.length === 1) || 
                             { id: 'default', menuId: params.menuId, name: 'General', path: [] };
          setSelectedSection(firstSection.path[0] || '');
          
          const itemsData = await repo.listItems(restaurantData.id, params.menuId, firstSection.path);
          setItems(itemsData);
        }
      } catch (error) {
        console.error('Error loading menu data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [params.menuId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Menu Editor</h1>
          <p className="text-gray-600 mb-4">
            No active restaurant found. Please contact support to set up your restaurant.
          </p>
          <Button asChild>
            <Link href="/dashboard/menus">Back to Menus</Link>
          </Button>
        </div>
      </div>
    );
  }

  const firstSection = sections.find((s: any) => s.path.length === 1) || 
                     { id: 'default', menuId: params.menuId, name: 'General', path: [] };

  return (
    <div className="p-6 grid grid-cols-12 gap-6">
      {/* Left: Sections */}
      <div className="col-span-12 md:col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sections</h2>
        </div>
        <SectionManager 
          restaurantId={restaurantId} 
          currentMenuSlug={params.menuId}
          selectedSection={selectedSection}
          onSectionSelect={setSelectedSection}
        />
      </div>

      {/* Right: Items */}
      <div className="col-span-12 md:col-span-8 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Items in {firstSection.path.length > 0 ? firstSection.path.join(' / ') : 'General'}
          </h2>
          <AddItemClient restaurantId={restaurantId} menuId={params.menuId} sectionPath={firstSection.path} />
        </div>
        <div className="grid grid-cols-1 gap-3">
          {items.map((it) => (
            <ItemRowClient key={it.id} item={it} />
          ))}
        </div>
      </div>
    </div>
  );
}
