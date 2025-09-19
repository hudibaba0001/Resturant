'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EditItemDialog } from '@/components/dashboard/EditItemDialog';
import type { Item } from '@/lib/types/menu';
import { deleteItemAction } from './actions';
import { updateItem } from '@/lib/api/items';
import type { ItemClient } from '@/lib/types/menuItem';

export function ItemRowClient({ item }: { item: Item }) {
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
        <form action={() => deleteItemAction(item.id, item.menu)}>
          <Button variant="destructive" type="submit">Delete</Button>
        </form>
      </div>

      <EditItemDialog open={open} onOpenChange={setOpen} initial={item} onSave={async (next) => {
        try {
          const payload: Partial<ItemClient> = {
            name: next.name,
            is_available: next.is_available,
            variant_groups: (next.variant_groups || []).map(g => ({
              name: g.name,
              choices: (g.options || []).map(o => ({ name: o.name }))
            })),
            modifier_groups: (next.modifier_groups || []).map(g => {
              const mg: any = { group: g.name, choices: (g.options || []).map(o => ({ name: o.name, price_cents: o.price_delta_cents ?? 0 })) };
              if (typeof g.min === 'number') mg.min = g.min;
              if (typeof g.max === 'number') mg.max = g.max;
              if (typeof g.required === 'boolean') mg.required = g.required;
              return mg;
            }),
            tags: [ ...(next.allergens || []), ...(next.dietary || []) ].filter(Boolean) as string[],
          };
          if (typeof next.price_cents === 'number') (payload as any).price_cents = next.price_cents;
          if (next.currency) (payload as any).currency = next.currency;
          if (next.description && next.description.trim()) (payload as any).description = next.description.trim();
          if (next.image_url && next.image_url.trim()) (payload as any).image_url = next.image_url.trim();
          const details: Record<string, unknown> = {};
          if (next.item_number) details.item_number = next.item_number;
          if (next.price_matrix && Object.keys(next.price_matrix).length) details.price_matrix = next.price_matrix;
          if (Object.keys(details).length) (payload as any).details = details;
          await updateItem(item.id, payload);
          setOpen(false);
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('items:refresh'));
        } catch (e: any) {
          alert(e?.message || 'Save failed');
        }
      }} />
    </Card>
  );
}
