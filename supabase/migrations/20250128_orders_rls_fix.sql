-- Fix missing RLS policies for orders table
-- This resolves the 404 "NOT_FOUND" errors when staff try to view order details

-- 0) Enable RLS (safe if already enabled)
alter table public.orders enable row level security;

-- 1) Staff SELECT on orders (owner|manager|editor)
drop policy if exists orders_staff_select on public.orders;
create policy orders_staff_select
on public.orders
for select
using (
  exists (
    select 1
    from public.restaurant_staff s
    where s.restaurant_id = orders.restaurant_id
      and s.user_id = auth.uid()
      and s.role in ('owner','manager','editor')
  )
);

-- 2) (Optional) allow viewers to read but not modify
-- drop policy if exists orders_viewer_select on public.orders;
-- create policy orders_viewer_select
-- on public.orders
-- for select
-- using (
--   exists (
--     select 1 from public.restaurant_staff s
--     where s.restaurant_id = orders.restaurant_id
--       and s.user_id = auth.uid()
--       and s.role in ('viewer')
--   )
-- );

-- 3) Sanity: matching policies already exist?
-- (Keep these if you created them; shown here for completeness.)
-- order_items
drop policy if exists order_items_staff_select on public.order_items;
create policy order_items_staff_select
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    join public.restaurant_staff s
      on s.restaurant_id = o.restaurant_id
     and s.user_id = auth.uid()
     and s.role in ('owner','manager','editor')
    where o.id = order_items.order_id
  )
);

-- menu_items
drop policy if exists menu_items_staff_select on public.menu_items;
create policy menu_items_staff_select
on public.menu_items
for select
using (
  exists (
    select 1 from public.restaurant_staff s
    where s.restaurant_id = menu_items.restaurant_id
      and s.user_id = auth.uid()
      and s.role in ('owner','manager','editor')
  )
);
