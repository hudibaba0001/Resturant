'use server';
import 'server-only';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabaseServer';

const Schema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  description: z.string().max(1000).optional().nullable(),
  cuisine: z.string().optional().nullable(),
  address: z.string().min(2, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  country: z.string().length(2, 'Country must be a 2-letter code').default('SE'),
});

export async function createTenant(fd: FormData) {
  const supabase = getSupabaseServer();
  
  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr) return { error: `auth_get_user: ${uErr.message}` };
  if (!user) return { error: 'not_authenticated' };

  const parsed = Schema.safeParse({
    name: fd.get('name'),
    description: fd.get('description'),
    cuisine: fd.get('cuisine'),
    address: fd.get('address') ?? '',
    city: fd.get('city') ?? 'Stockholm',
    country: fd.get('country') ?? 'SE',
  });
  
  if (!parsed.success) {
    return { error: 'validation', details: parsed.error.flatten() };
  }

  const { name, description, cuisine, address, city, country } = parsed.data;
  
  const { data, error } = await supabase.rpc('create_restaurant_tenant', {
    p_name: name,
    p_desc: description ?? null,
    p_cuisine: cuisine ?? null,
    p_address: address,
    p_city: city,
    p_country: country,
  });
  
  if (error) return { error: `rpc_error: ${error.message}` };
  
  return { ok: true, restaurantId: data as string };
}


