import { MenuRepository } from '@/lib/menuRepo';
import { getServerSupabase } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/slug';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';
import CreateMenuClient from '@/components/dashboard/CreateMenuClient';

async function getRestaurantId(): Promise<string | null> {
  try {
    const supabase = getServerSupabase();
    // For MVP, pick the first active restaurant owned by current user or any active
    const { data, error } = await supabase.from('restaurants').select('id').eq('is_active', true).limit(1).maybeSingle();
    
    if (error) {
      console.error('Error fetching restaurant:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Error in getRestaurantId:', error);
    return null;
  }
}

export default async function MenusPage() {
  try {
    const restaurantId = await getRestaurantId();
    
    if (!restaurantId) {
      return (
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">Menu Management</h1>
            <p className="text-gray-600 mb-4">
              No active restaurant found. Please contact support to set up your restaurant.
            </p>
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      );
    }

    const repo = new MenuRepository('simple');
    const menus = await repo.listMenus(restaurantId);

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Menus</h1>
          <CreateMenuClient />
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
  } catch (error) {
    console.error('Error in MenusPage:', error);
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Menu Management</h1>
          <p className="text-gray-600 mb-4">
            Something went wrong loading the menu management system.
          </p>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
}
