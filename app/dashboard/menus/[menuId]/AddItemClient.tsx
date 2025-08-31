'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EditItemDialog } from '@/components/dashboard/EditItemDialog';
import { useRouter } from 'next/navigation';

export function AddItemClient({ restaurantId, menuId, sectionPath }: { restaurantId: string, menuId: string, sectionPath: string[] }) {
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
