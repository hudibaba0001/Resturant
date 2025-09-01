import { MenuRepository } from '@/lib/menuRepo';
import { getServerSupabase } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import type { Item } from '@/lib/types/menu';
import AddItemClient from '@/components/dashboard/AddItemClient';
import { ItemRowClient } from './ItemRowClient';
import SectionManager from '@/components/dashboard/SectionManager';
import Link from 'next/link';

async function getRestaurantId(): Promise<string | null> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase.from('restaurants').select('id').eq('is_active', true).limit(1).maybeSingle();
    
    if (error) {
      console.error('Error fetching restaurant:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Error in getRestaurantId:', error);
    return null;
  }
}

export default async function MenuEditorPage({ params }: { params: { menuId: string } }) {
  try {
    const restaurantId = await getRestaurantId();
    
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

    // Use the new API to get sections and items
    const repo = new MenuRepository('persistent');
    const sections = await repo.listSections(restaurantId, params.menuId);
    const firstSection = sections.find(s => s.path.length === 1) || { id: 'default', menuId: params.menuId, name: 'General', path: [] };
    const items = await repo.listItems(restaurantId, params.menuId, firstSection.path);

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
            selectedSection={firstSection.path[0] || ''}
            onSectionSelect={(sectionName) => {
              // This will be handled by the SectionManager component
              console.log('Section selected:', sectionName);
            }}
          />
        </div>

        {/* Right: Items */}
        <div className="col-span-12 md:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 id={`section-${encodeURIComponent(firstSection.id)}`} className="text-lg font-semibold">
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
  } catch (error) {
    console.error('Error in MenuEditorPage:', error);
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Menu Editor</h1>
          <p className="text-gray-600 mb-4">
            Something went wrong loading the menu editor.
          </p>
          <Button asChild>
            <Link href="/dashboard/menus">Back to Menus</Link>
          </Button>
        </div>
      </div>
    );
  }
}
