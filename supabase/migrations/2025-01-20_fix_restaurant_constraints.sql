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

-- Tell PostgREST to reload schema
notify pgrst, 'reload schema';
