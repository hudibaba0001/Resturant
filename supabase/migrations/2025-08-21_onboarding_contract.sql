-- Onboarding Contract v1 - Canonical RPC & Constraints
-- This creates a stable contract that won't change

-- (A) Add unique constraint for ON CONFLICT
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='uniq_owner_name'
      and conrelid='public.restaurants'::regclass
  ) then
    alter table public.restaurants
      add constraint uniq_owner_name unique (owner_id, name);
  end if;
end $$;

-- (B) Remove old overload to remove ambiguity
drop function if exists public.create_restaurant_tenant(text, text, text);

-- (C) Create the canonical 6-arg function
create or replace function public.create_restaurant_tenant(
  p_name    text,
  p_desc    text,
  p_cuisine text default null,
  p_address text default '',
  p_city    text default 'Stockholm',
  p_country text default 'SE'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare r_id uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  insert into public.restaurants
    (name, description, cuisine_type, owner_id, address, city, country)
  values
    (p_name, p_desc, p_cuisine, uid,
     coalesce(p_address,''), coalesce(p_city,'Stockholm'), coalesce(p_country,'SE'))
  on conflict (owner_id, name) do update
    set description=excluded.description,
        cuisine_type=excluded.cuisine_type,
        address=excluded.address,
        city=excluded.city,
        country=excluded.country,
        updated_at=now()
  returning id into r_id;

  insert into public.restaurant_staff(restaurant_id, user_id, role)
  values (r_id, uid, 'owner') on conflict (restaurant_id, user_id) do nothing;

  insert into public.menu_sections(restaurant_id, name, position)
  values (r_id, 'Mains', 0) on conflict do nothing;

  return r_id;
end $$;

grant execute on function public.create_restaurant_tenant(text,text,text,text,text,text) to authenticated;

-- ensure not-null compliance on existing rows (safety)
update public.restaurants set address='' where address is null;
update public.restaurants set city='Stockholm' where city is null;

notify pgrst, 'reload schema';
