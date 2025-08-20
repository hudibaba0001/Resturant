'use server';
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const Schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  cuisine: z.string().optional(),
});

export async function createTenant(fd: FormData) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

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


