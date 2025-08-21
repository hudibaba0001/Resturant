-- Create/replace the tenant creation RPC
create or replace function public.create_restaurant_tenant(
  p_name    text,
  p_desc    text,
  p_cuisine text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r_id uuid;
  uid  uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Upsert restaurant by (owner_id, name)
  insert into public.restaurants(name, description, cuisine_type, owner_id)
  values (p_name, p_desc, p_cuisine, uid)
  on conflict (owner_id, name) do update set updated_at = now()
  returning id into r_id;

  -- Ensure owner role
  insert into public.restaurant_staff(restaurant_id, user_id, role)
  values (r_id, uid, 'owner')
  on conflict (restaurant_id, user_id) do nothing;

  -- Ensure a default section
  insert into public.menu_sections(restaurant_id, name, position)
  values (r_id, 'Mains', 0)
  on conflict do nothing;

  return r_id;
end $$;

-- Callable by logged-in users
grant execute on function public.create_restaurant_tenant(text, text, text) to authenticated;

-- Make PostgREST see new function immediately
notify pgrst, 'reload schema';
