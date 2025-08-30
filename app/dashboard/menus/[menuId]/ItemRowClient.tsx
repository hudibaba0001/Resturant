'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EditItemDialog } from '@/components/dashboard/EditItemDialog';
import type { Item } from '@/lib/types/menu';
import { deleteItemAction } from './actions';

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
        const res = await fetch('/dashboard/api/item/save', { method: 'POST', body: JSON.stringify(next) });
        if (!res.ok) { alert('Save failed'); return; }
        setOpen(false);
        // soft refresh
        window.location.reload();
      }} />
    </Card>
  );
}
