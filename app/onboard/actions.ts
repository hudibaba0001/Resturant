'use server';
import 'server-only';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabaseServer';

const Schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  cuisine: z.string().optional(),
});

export async function createTenant(fd: FormData) {
  try {
    const supabase = getSupabaseServer();

    const { data: { user }, error: uErr } = await supabase.auth.getUser();
    if (uErr) return { error: `auth_get_user: ${uErr.message}` };
    if (!user) return { error: 'not_authenticated' };

    const parsed = Schema.safeParse({
      name: fd.get('name'),
      description: fd.get('description'),
      cuisine: fd.get('cuisine'),
    });
    if (!parsed.success) return { error: 'validation', details: parsed.error.flatten() };

    const { name, description, cuisine } = parsed.data;
    const { data, error } = await supabase.rpc('create_restaurant_tenant', {
      p_name: name, p_desc: description ?? null, p_cuisine: cuisine ?? null
    });

    if (error) return { error: `rpc_error: ${error.message}` };
    return { ok: true, restaurantId: data as string };
  } catch (e: any) {
    console.error('createTenant error', e);
    return { error: `unhandled: ${e?.message || 'unknown'}` };
  }
}


