'use server';

import { MenuRepository } from '@/lib/menuRepo';
import { revalidatePath } from 'next/cache';

export async function deleteItemAction(itemId: string, menuId: string) {
  const repo = new MenuRepository('simple');
  await repo.deleteItem(itemId);
  revalidatePath(`/dashboard/menus/${menuId}`);
}
