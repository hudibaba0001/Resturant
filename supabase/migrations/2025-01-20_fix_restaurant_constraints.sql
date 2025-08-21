-- Check for duplicates that would block the constraint
-- Run this first to see if there are any duplicates
-- select owner_id, name, count(*) as n
-- from public.restaurants
-- group by owner_id, name
-- having count(*) > 1;

-- If duplicates exist, dedupe (keep the oldest row per pair)
with d as (
  select id,
         row_number() over (partition by owner_id, name order by created_at asc) as rn
  from public.restaurants
)
delete from public.restaurants r
using d
where r.id = d.id and d.rn > 1;

-- Add the unique constraint (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'uniq_owner_name'
      and conrelid = 'public.restaurants'::regclass
  ) then
    alter table public.restaurants
      add constraint uniq_owner_name unique (owner_id, name);
  end if;
end $$;

-- Update the RPC function with address defaults
create or replace function public.create_restaurant_tenant(
  p_name    text,
  p_desc    text,
  p_cuisine text default null,
  p_address text default '',              -- NEW: default to empty string
  p_city    text default 'Stockholm',     -- NEW: required in schema
  p_country text default 'SE'             -- schema default was 'US'; set EU-friendly
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

  insert into public.restaurants
    (name, description, cuisine_type, owner_id, address, city, country)
  values
    (p_name, p_desc, p_cuisine, uid, coalesce(p_address,''), coalesce(p_city,'Stockholm'), coalesce(p_country,'SE'))
  on conflict (owner_id, name) do update
    set description = excluded.description,
        cuisine_type = excluded.cuisine_type,
        address = excluded.address,
        city = excluded.city,
        country = excluded.country,
        updated_at = now()
  returning id into r_id;

  insert into public.restaurant_staff(restaurant_id, user_id, role)
  values (r_id, uid, 'owner')
  on conflict (restaurant_id, user_id) do nothing;

  insert into public.menu_sections(restaurant_id, name, position)
  values (r_id, 'Mains', 0)
  on conflict do nothing;

  return r_id;
end $$;

-- Grant permissions
grant execute on function public.create_restaurant_tenant(text, text, text, text, text, text) to authenticated;

-- Tell PostgREST to reload schema
notify pgrst, 'reload schema';
