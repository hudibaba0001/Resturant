import { MenuRepository } from '@/lib/menuRepo';
import { getServerSupabase } from '@/lib/supabase/server';
import { EditItemDialog } from '@/components/dashboard/EditItemDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import type { Item } from '@/lib/types/menu';

async function getRestaurantId(): Promise<string> {
  const supabase = getServerSupabase();
  const { data } = await supabase.from('restaurants').select('id').eq('is_active', true).limit(1).maybeSingle();
  return data?.id as string;
}

export default async function MenuEditorPage({ params }: { params: { menuId: string } }) {
  const restaurantId = await getRestaurantId();
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
          <AddItemButton restaurantId={restaurantId} menuId={params.menuId} sectionPath={firstSection.path} />
        </div>
        <div className="grid grid-cols-1 gap-3">
          {items.map((it) => (
            <ItemRow key={it.id} item={it} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AddSectionButton({ menuId }: { menuId: string }) {
  return (
    <form action={async (fd: FormData) => {
      'use server';
      const name = String(fd.get('name') || 'New Section');
      const restaurantId = await getRestaurantId();
      const repo = new MenuRepository('simple');
      await repo.createSection(restaurantId, menuId, name, null);
      revalidatePath(`/dashboard/menus/${menuId}`);
    }} className="flex items-center gap-2">
      <Input name="name" placeholder="Add section" />
      <Button type="submit" variant="secondary">+ Add</Button>
    </form>
  );
}

function AddItemButton({ restaurantId, menuId, sectionPath }: { restaurantId: string, menuId: string, sectionPath: string[] }) {
  return (
    <form action={async () => {}}>
      {/* Client-side dialog handles creation to let user fill fields */}
      <AddItemClient restaurantId={restaurantId} menuId={menuId} sectionPath={sectionPath} />
    </form>
  );
}

'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

function AddItemClient({ restaurantId, menuId, sectionPath }: { restaurantId: string, menuId: string, sectionPath: string[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Item</Button>
      {open && (
        <EditItemDialog
          open={open}
          onOpenChange={setOpen}
          initial={{
            id: crypto.randomUUID(),
            restaurant_id: restaurantId,
            name: '',
            description: '',
            image_url: '',
            price_cents: null,
            currency: 'SEK',
            allergens: [],
            is_available: true,
            menu: menuId,
            section_path: sectionPath,
            dietary: [],
            item_number: null,
            variant_groups: [],
            modifier_groups: [],
            price_matrix: {},
          }}
          onSave={async (next) => {
            const res = await fetch('/dashboard/api/item/save', { method: 'POST', body: JSON.stringify(next) });
            if (!res.ok) { alert('Save failed'); return; }
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function ItemRow({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-3 flex items-center gap-3">
      <img src={item.image_url || 'https://placehold.co/64'} alt="" className="h-16 w-16 rounded object-cover" />
      <div className="flex-1">
        <div className="font-medium">{item.name}</div>
        <div className="text-xs text-muted-foreground">{item.section_path.join(' / ')} • {item.currency || 'SEK'} {((item.price_cents ?? 0)/100).toFixed(2)}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setOpen(true)}>Edit</Button>
        <form action={async () => {
          'use server';
          const repo = new MenuRepository('simple');
          await repo.deleteItem(item.id);
          revalidatePath(`/dashboard/menus/${item.menu}`);
        }}>
          <Button variant="destructive" type="submit">Delete</Button>
        </form>
      </div>

      <EditItemDialog open={open} onOpenChange={setOpen} initial={item} onSave={async (next) => {
        const res = await fetch('/dashboard/api/item/save', { method: 'POST', body: JSON.stringify(next) });
        if (!res.ok) { alert('Save failed'); return; }
        setOpen(false);
        // soft refresh
        window.location.reload();
      }} />
    </Card>
  );
}
