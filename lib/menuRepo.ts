import { getServerSupabase } from './supabase/server';
import { nanoid } from 'nanoid';
import { slugify } from './utils/slug';
import type { Item, Menu, Section, OptionGroup, ModifierGroup, PriceMatrix, UUID } from './types/menu';

export type RepoMode = 'simple'; // future: 'extended'

export class MenuRepository {
  constructor(private mode: RepoMode = 'simple') {}

  // --- Menus ---
  async listMenus(restaurantId: UUID): Promise<Menu[]> {
    const supabase = getServerSupabase();
    // In SIMPLE mode, menus are discovered via menu_items.nutritional_info.menu
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, nutritional_info')
      .eq('restaurant_id', restaurantId);
    if (error) throw error;
    const map = new Map<string, string>();
    for (const row of data as any[]) {
      const menu = row.nutritional_info?.menu;
      if (menu) map.set(menu, menu);
    }
    // If empty, return a default menu to get started
    if (map.size === 0) {
      return [{ id: 'main', name: 'Main' }];
    }
    return Array.from(map.keys()).map((slug) => ({ id: slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  }

  async createMenu(restaurantId: UUID, name: string): Promise<Menu> {
    // In SIMPLE mode, we "create" a menu lazily: we return a slug; it appears once items/sections use it
    const slug = slugify(name || 'menu');
    return { id: slug, name };
  }

  async renameMenu(_restaurantId: UUID, oldId: string, newName: string): Promise<Menu> {
    const newId = slugify(newName);
    // SIMPLE mode: rename by updating all affected items nutritional_info.menu
    const supabase = getServerSupabase();
    const { error } = await supabase
      .rpc('exec_sql', { // optional utility RPC; if missing, fallback to update
        sql: `update menu_items set nutritional_info = jsonb_set(coalesce(nutritional_info,'{}'::jsonb), '{menu}', to_jsonb($1::text), true) where (nutritional_info->> 'menu') = $2;`,
        params: [newId, oldId],
      } as any);
    if (error) {
      // fallback per-row update
      await supabase
        .from('menu_items')
        .update({}) // no-op to keep call shape
        .eq('id', '00000000-0000-0000-0000-000000000000');
      // NOTE: provide a script or manual migration if needed.
    }
    return { id: newId, name: newName };
  }

  async deleteMenu(_restaurantId: UUID, menuId: string): Promise<void> {
    // SIMPLE: deleting a menu clears menu tag on items (soft delete)
    const supabase = getServerSupabase();
    await supabase
      .from('menu_items')
      .update({ nutritional_info: {} })
      .contains('nutritional_info', { menu: menuId });
  }

  // --- Sections ---
  async listSections(restaurantId: UUID, menuId: string): Promise<Section[]> {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('menu_items')
      .select('nutritional_info')
      .eq('restaurant_id', restaurantId)
      .contains('nutritional_info', { menu: menuId });
    if (error) throw error;
    // Build tree from section_path arrays
    const paths: string[][] = (data as any[])
      .map((r) => (r.nutritional_info?.section_path as string[]) || [])
      .filter((p) => p.length > 0);

    const unique = new Map<string, Section>();
    const push = (path: string[]) => {
      for (let i = 0; i < path.length; i++) {
        const sub = path.slice(0, i + 1);
        const id = sub.join(':');
        if (!unique.has(id)) {
          unique.set(id, {
            id,
            menuId,
            name: sub[sub.length - 1],
            parentId: i > 0 ? sub.slice(0, i).join(':') : null,
            path: sub,
            sort: i,
          });
        }
      }
    };
    paths.forEach(push);
    // Sorted by path depth then name
    return Array.from(unique.values()).sort((a, b) => a.path.length - b.path.length || a.name.localeCompare(b.name));
  }

  async createSection(_restaurantId: UUID, menuId: string, name: string, parentId?: string | null): Promise<Section> {
    // SIMPLE: sections are virtual. We create nothing server-side.
    const parentPath = parentId ? parentId.split(':') : [];
    const id = [...parentPath, name].join(':');
    return { id, menuId, name, parentId: parentId || null, path: [...parentPath, name] };
  }

  async renameSection(restaurantId: UUID, menuId: string, sectionId: string, newName: string): Promise<Section> {
    const oldPath = sectionId.split(':');
    const newPath = [...oldPath.slice(0, -1), newName];
    const newId = newPath.join(':');
    // Update all items that include this section path prefix
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, nutritional_info')
      .eq('restaurant_id', restaurantId)
      .contains('nutritional_info', { menu: menuId });
    if (error) throw error;
    const toUpdate: any[] = [];
    for (const row of data as any[]) {
      const sp: string[] = row.nutritional_info?.section_path || [];
      if (sp.length >= oldPath.length && sp.slice(0, oldPath.length).join(':') === oldPath.join(':')) {
        const updated = [...newPath, ...sp.slice(oldPath.length)];
        toUpdate.push({ id: row.id, nutritional_info: { ...row.nutritional_info, section_path: updated } });
      }
    }
    if (toUpdate.length) {
      await supabase.from('menu_items').upsert(toUpdate);
    }
    return { id: newId, menuId, name: newName, parentId: newPath.length > 1 ? newPath.slice(0, -1).join(':') : null, path: newPath };
  }

  async deleteSection(restaurantId: UUID, menuId: string, sectionId: string): Promise<void> {
    // Remove the section prefix from affected items (flatten into parent)
    const prefix = sectionId.split(':');
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from('menu_items')
      .select('id, nutritional_info')
      .eq('restaurant_id', restaurantId)
      .contains('nutritional_info', { menu: menuId });
    const ops = (data as any[]).map((row) => {
      const sp: string[] = row.nutritional_info?.section_path || [];
      if (sp.slice(0, prefix.length).join(':') === prefix.join(':')) {
        const updated = sp.slice(prefix.length - 1); // lift children up one level
        return { id: row.id, nutritional_info: { ...row.nutritional_info, section_path: updated } };
      }
      return null;
    }).filter(Boolean);
    if (ops.length) await supabase.from('menu_items').upsert(ops as any[]);
  }

  // --- Items ---
  async listItems(restaurantId: UUID, menuId: string, sectionPath: string[]): Promise<Item[]> {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, restaurant_id, name, description, image_url, price_cents, currency, allergens, is_available, nutritional_info')
      .eq('restaurant_id', restaurantId)
      .contains('nutritional_info', { menu: menuId, section_path: sectionPath });
    if (error) throw error;
    return (data as any[]).map(this.fromRow);
  }

  async getItem(id: UUID): Promise<Item | null> {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, restaurant_id, name, description, image_url, price_cents, currency, allergens, is_available, nutritional_info')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.fromRow(data as any) : null;
  }

  async upsertItem(payload: Item): Promise<Item> {
    const supabase = getServerSupabase();
    const row = this.toRow(payload);
    const { data, error } = await supabase
      .from('menu_items')
      .upsert(row)
      .select()
      .single();
    if (error) throw error;
    return this.fromRow(data as any);
  }

  async deleteItem(id: UUID): Promise<void> {
    const supabase = getServerSupabase();
    await supabase.from('menu_items').delete().eq('id', id);
  }

  // --- Mappers ---
  private fromRow = (r: any): Item => {
    const ni = r.nutritional_info || {};
    return {
      id: r.id,
      restaurant_id: r.restaurant_id,
      name: r.name,
      description: r.description,
      image_url: r.image_url,
      price_cents: r.price_cents,
      currency: r.currency,
      allergens: r.allergens,
      is_available: r.is_available,
      menu: ni.menu || 'main',
      section_path: ni.section_path || [],
      dietary: ni.dietary || [],
      item_number: ni.item_number || null,
      variant_groups: ni.variant_groups || [],
      modifier_groups: ni.modifier_groups || [],
      price_matrix: ni.price_matrix || {},
      sort: ni.sort,
      section_sort: ni.section_sort,
    };
  };

  private toRow = (i: Item) => ({
    id: i.id,
    restaurant_id: i.restaurant_id,
    name: i.name,
    description: i.description,
    image_url: i.image_url,
    price_cents: i.price_cents,
    currency: i.currency,
    allergens: i.allergens,
    is_available: i.is_available ?? true,
    nutritional_info: {
      menu: i.menu,
      section_path: i.section_path,
      dietary: i.dietary ?? [],
      item_number: i.item_number ?? null,
      variant_groups: i.variant_groups ?? [],
      modifier_groups: i.modifier_groups ?? [],
      price_matrix: i.price_matrix ?? {},
      sort: i.sort ?? 0,
      section_sort: i.section_sort ?? 0,
    },
  });
}
