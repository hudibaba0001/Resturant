'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils/slug';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';

export default function CreateMenuClient() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Create New Menu</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Menu</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Lunch"
          />
          <Button
            onClick={() => {
              const slug = slugify(name || 'menu');
              setOpen(false);
              router.push(`/dashboard/menus/${slug}`);
            }}
          >
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
