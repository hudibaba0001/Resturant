-- Widget Orders RLS: Allow anonymous widget sessions to create orders
-- This maintains tenant isolation without requiring service keys

-- Helper function: validate a widget session belongs to the restaurant
create or replace function public.widget_can_order(p_restaurant uuid, p_session uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.widget_sessions ws
    where ws.id = p_session
      and ws.restaurant_id = p_restaurant
      and ws.last_seen_at > now() - interval '7 days' -- adjust if needed
  );
$$;

revoke all on function public.widget_can_order(uuid, uuid) from public;
grant execute on function public.widget_can_order(uuid, uuid) to anon, authenticated;

-- Orders: allow INSERT if the session is valid for that restaurant
alter table public.orders enable row level security;

drop policy if exists orders_widget_insert on public.orders;
create policy orders_widget_insert
on public.orders
for insert
to anon
with check ( public.widget_can_order(restaurant_id, session_id) );

-- Read-back of the order by the same session (optional but helpful for the widget)
drop policy if exists orders_widget_select on public.orders;
create policy orders_widget_select
on public.orders
for select
to anon
using ( public.widget_can_order(restaurant_id, session_id) );

-- Order items: allow INSERT/SELECT when the parent order is visible via the same session
alter table public.order_items enable row level security;

drop policy if exists order_items_widget_insert on public.order_items;
create policy order_items_widget_insert
on public.order_items
for insert
to anon
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and public.widget_can_order(o.restaurant_id, o.session_id)
  )
);

drop policy if exists order_items_widget_select on public.order_items;
create policy order_items_widget_select
on public.order_items
for select
to anon
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and public.widget_can_order(o.restaurant_id, o.session_id)
  )
);
