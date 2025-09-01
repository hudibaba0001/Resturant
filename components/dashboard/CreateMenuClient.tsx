'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateMenuClient({ restaurantId }: { restaurantId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ restaurantId, name }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.code || 'MENU_CREATE_ERROR');

      // Navigate to editor using slug or id
      const slug = j?.data?.menu?.slug || j?.menu?.slug; // handle both {ok,data} and legacy
      router.push(`/dashboard/menus/${slug}`);
      setOpen(false);
      setName('');
    } catch (e) {
      console.error('Create menu failed:', e);
      alert('Could not create menu'); // swap to your toast system later
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Create New Menu</Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">Create a menu</h2>
            <Input
              placeholder="e.g. Lunch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={create} disabled={busy || !name.trim()}>
                {busy ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CreateMenuClient;
