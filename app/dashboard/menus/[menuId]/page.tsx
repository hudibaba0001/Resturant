import { MenuRepository } from '@/lib/menuRepo';
import { getServerSupabase } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import type { Item } from '@/lib/types/menu';
import AddItemClient from '@/components/dashboard/AddItemClient';
import { ItemRowClient } from './ItemRowClient';
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

    const repo = new MenuRepository('simple');
    const sections = await repo.listSections(restaurantId, params.menuId);
    const firstSection = sections.find(s => s.path.length === 1) || { id: 'default', menuId: params.menuId, name: 'General', path: ['General'] };
    const items = await repo.listItems(restaurantId, params.menuId, firstSection.path);

    return (
      <div className="p-6 grid grid-cols-12 gap-6">
        {/* Left: Sections */}
        <div className="col-span-12 md:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sections</h2>
            <AddSectionButton menuId={params.menuId} />
          </div>
          <div className="space-y-2">
            {sections.map((s) => (
              <a key={s.id} href={`#section-${encodeURIComponent(s.id)}`} className="block rounded-lg border p-2 hover:bg-muted">
                {s.path.join(' / ')}
              </a>
            ))}
          </div>
        </div>

        {/* Right: Items */}
        <div className="col-span-12 md:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 id={`section-${encodeURIComponent(firstSection.id)}`} className="text-lg font-semibold">Items in {firstSection.path.join(' / ')}</h2>
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

function AddSectionButton({ menuId }: { menuId: string }) {
  return (
    <form action={async (fd: FormData) => {
      'use server';
      try {
        const name = String(fd.get('name') || 'New Section');
        const restaurantId = await getRestaurantId();
        
        if (!restaurantId) {
          console.error('No restaurant ID found for section creation');
          return;
        }
        
        const repo = new MenuRepository('simple');
        await repo.createSection(restaurantId, menuId, name, null);
        revalidatePath(`/dashboard/menus/${menuId}`);
      } catch (error) {
        console.error('Error creating section:', error);
      }
    }} className="flex items-center gap-2">
      <Input name="name" placeholder="Add section" />
      <Button type="submit" variant="secondary">+ Add</Button>
    </form>
  );
}
