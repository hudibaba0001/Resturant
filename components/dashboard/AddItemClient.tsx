'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EditItemDialog } from '@/components/dashboard/EditItemDialog';
import { createItem } from '@/lib/api/items';
import type { ItemClient } from '@/lib/validators/itemClient';

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
              const payload: ItemClient = {
                restaurantId,
                menu: menuId,
                name: next.name,
                price_cents: next.price_cents ?? 0,
                currency: (next.currency || 'SEK').toUpperCase(),
                section_path: sectionPath,
                description: next.description || undefined,
                image_url: next.image_url || undefined,
                is_available: next.is_available,
                // Map variant UI structure to API structure (choices array)
                variant_groups: (next.variant_groups || []).map(g => ({
                  name: g.name,
                  choices: (g.options || []).map(o => ({ name: o.name }))
                })),
                // Map modifier UI structure to API structure
                modifier_groups: (next.modifier_groups || []).map(g => ({
                  group: g.name,
                  min: g.min,
                  max: g.max,
                  required: g.required,
                  choices: (g.options || []).map(o => ({ name: o.name, price_cents: o.price_delta_cents ?? 0 }))
                })),
                // Fold common flags into tags; keep optional
                tags: [
                  ...(next.allergens || []),
                  ...(next.dietary || []),
                ].filter(Boolean) as string[],
                // Preserve extra structured fields under details
                details: {
                  ...(next.item_number ? { item_number: next.item_number } : {}),
                  ...(next.price_matrix && Object.keys(next.price_matrix).length ? { price_matrix: next.price_matrix } : {}),
                },
              };

              const result = await createItem(payload);
              console.log("🚀 API success:", result);
              setOpen(false);
              // Notify any listeners (e.g., ItemsPanel) to refresh
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('items:refresh'));
              }
              router.refresh();
            } catch (error) {
              console.error("🚀 API error:", error);
              const msg = (error as any)?.issues
                ? (error as any).issues.map((i: any) => `${i.path?.join('.')}: ${i.message}`).join(' · ')
                : (error instanceof Error ? error.message : 'Unknown error');
              alert(`Could not create item: ${msg}`);
            }
          }}
        />
      )}
    </>
  );
}
