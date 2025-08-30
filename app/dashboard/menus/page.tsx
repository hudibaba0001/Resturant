import { MenuRepository } from '@/lib/menuRepo';
import { getServerSupabase } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/slug';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';

async function getRestaurantId(): Promise<string> {
  const supabase = getServerSupabase();
  // For MVP, pick the first active restaurant owned by current user or any active
  const { data } = await supabase.from('restaurants').select('id').eq('is_active', true).limit(1).maybeSingle();
  return data?.id as string;
}

export default async function MenusPage() {
  const restaurantId = await getRestaurantId();
  const repo = new MenuRepository('simple');
  const menus = await repo.listMenus(restaurantId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Menus</h1>
        <CreateMenuButton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {menus.map((m) => (
          <Card key={m.id} className="hover:shadow">
            <CardHeader>
              <CardTitle>{m.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Link className="underline" href={`/dashboard/menus/${m.id}`}>Edit</Link>
              {/* Delete is a soft delete in simple mode; hide by default */}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateMenuButton() {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader><DialogTitle>Create New Menu</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2">
          <Input name="name" placeholder="e.g., Lunch" />
          <Button type="submit" asChild>
            <a href="#" onClick={(e) => { e.preventDefault(); const input = (e.currentTarget.closest('div')?.querySelector('input[name=name]') as HTMLInputElement); const name = input?.value || 'Menu'; window.location.href = `/dashboard/menus/${slugify(name)}`; }}>Create</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
