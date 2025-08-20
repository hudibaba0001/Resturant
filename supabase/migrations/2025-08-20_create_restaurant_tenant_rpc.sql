-- Create restaurant tenant RPC function
-- This function creates a restaurant with proper RLS handling

create or replace function public.create_restaurant_tenant(
  p_name text,
  p_desc text,
  p_cuisine text default null
)
returns uuid
language plpgsql
security definer               -- bypass RLS in this function
set search_path = public
as $$
declare
  r_id uuid;
  uid  uuid := auth.uid();     -- still the caller's user id
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  -- create or reuse (idempotent by owner+name)
  insert into public.restaurants(name, description, cuisine_type, owner_id, slug, is_active, is_verified)
  values (p_name, p_desc, p_cuisine, uid, lower(regexp_replace(p_name, '[^a-z0-9]', '-', 'g')), true, false)
  on conflict (owner_id, name) do update
    set updated_at = now()
  returning id into r_id;

  insert into public.restaurant_staff(restaurant_id, user_id, role)
  values (r_id, uid, 'owner')
  on conflict (restaurant_id, user_id) do nothing;

  -- ensure a default section
  insert into public.menu_sections(restaurant_id, name, description, position)
  values (r_id, 'Main Menu', 'Our main menu items', 1)
  on conflict do nothing;

  return r_id;
end $$;

-- Helpful invariant
alter table public.restaurants
  add constraint if not exists uniq_owner_name unique (owner_id, name);

-- Grant execute permissions to authenticated users
grant execute on function public.create_restaurant_tenant(text, text, text) to authenticated;
