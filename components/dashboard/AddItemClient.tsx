'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ItemEditor } from '@/components/dashboard/ItemEditor';

export default function AddItemClient({
  restaurantId,
  menuId,
  sectionPath,
  sectionId,
}: {
  restaurantId: string;
  menuId: string;
  sectionPath: string[];
  sectionId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Item</Button>
      <ItemEditor
        open={open}
        onOpenChange={setOpen}
        restaurantId={restaurantId}
        menu={menuId}
        sectionPath={sectionPath}
        sectionId={sectionId}
        onSaved={(id) => {
          console.log('✅ Item saved with ID:', id);
          // Notify any listeners to refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('items:refresh'));
          }
        }}
      />
    </>
  );
}
