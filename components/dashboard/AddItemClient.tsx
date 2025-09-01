'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EditItemDialog } from '@/components/dashboard/EditItemDialog';

export default function AddItemClient({
  restaurantId,
  menuId,
  sectionPath,
}: {
  restaurantId: string;
  menuId: string;
  sectionPath: string[];
}) {
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
            console.log("🚀 AddItemClient onSave called with:", next);
            try {
              const res = await fetch('/api/dashboard/items', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  restaurantId,
                  menu: menuId,
                  sectionPath,
                  name: next.name,
                  description: next.description,
                  price_cents: next.price_cents,
                  currency: next.currency,
                  image_url: next.image_url,
                  is_available: next.is_available,
                  allergens: next.allergens,
                  dietary: next.dietary,
                  variants: next.variant_groups,
                  modifiers: next.modifier_groups,
                }),
              });
              
              console.log("🚀 API response status:", res.status);
              
              if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.code || 'ITEM_CREATE_ERROR');
              }
              
              const result = await res.json();
              console.log("🚀 API success:", result);
              
              setOpen(false);
              router.refresh();
            } catch (error) {
              console.error("🚀 API error:", error);
              alert(`Could not create item: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }}
        />
      )}
    </>
  );
}
