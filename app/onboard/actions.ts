'use server';
import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';

const Schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  cuisine: z.string().optional(),
});

export async function createTenant(formData: FormData) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );

  // Must have a session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'not_authenticated' };

  const parsed = Schema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    cuisine: formData.get('cuisine'),
  });
  if (!parsed.success) {
    return { error: 'validation', details: parsed.error.flatten() };
  }

  const { name, description, cuisine } = parsed.data;
  const { data, error } = await supabase.rpc('create_restaurant_tenant', {
    p_name: name, p_desc: description ?? null, p_cuisine: cuisine ?? null
  });
  if (error) return { error: error.message };
  return { ok: true, restaurantId: data as string };
}
