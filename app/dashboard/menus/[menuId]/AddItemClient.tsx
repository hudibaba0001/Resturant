'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EditItemDialog } from '@/components/dashboard/EditItemDialog';
import { createItem } from '@/lib/api/items';
import type { ItemClient } from '@/lib/types/menuItem';
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
            const payload: ItemClient = {
              restaurantId,
              menu: menuId,
              name: next.name,
              price_cents: next.price_cents ?? 0,
              currency: (next.currency || 'SEK').toUpperCase(),
              section_path: sectionPath,
              is_available: next.is_available,
              variant_groups: (next.variant_groups || []).map(g => ({
                name: g.name,
                choices: (g.options || []).map(o => ({ name: o.name }))
              })),
              modifier_groups: (next.modifier_groups || []).map(g => {
                const mg: any = {
                  group: g.name,
                  choices: (g.options || []).map(o => ({ name: o.name, price_cents: o.price_delta_cents ?? 0 })),
                };
                if (typeof g.min === 'number') mg.min = g.min;
                if (typeof g.max === 'number') mg.max = g.max;
                if (typeof g.required === 'boolean') mg.required = g.required;
                return mg;
              }),
              tags: [ ...(next.allergens || []), ...(next.dietary || []) ].filter(Boolean) as string[],
            };
            if (next.description && next.description.trim()) (payload as any).description = next.description.trim();
            if (next.image_url && next.image_url.trim()) (payload as any).image_url = next.image_url.trim();
            const details: Record<string, unknown> = {};
            if (next.item_number) details.item_number = next.item_number;
            if (next.price_matrix && Object.keys(next.price_matrix).length) details.price_matrix = next.price_matrix;
            if (Object.keys(details).length) (payload as any).details = details;
            await createItem(payload);
            if (typeof window !== 'undefined') window.dispatchEvent(new Event('items:refresh'));
            router.refresh();
          }}
        />
      )}
    </>
  );
}
