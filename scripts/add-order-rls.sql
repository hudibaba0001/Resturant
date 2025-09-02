-- Enable RLS on orders tables
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Drop existing policies if they exist
drop policy if exists orders_read_by_tenant on public.orders;
drop policy if exists order_items_read_by_tenant on public.order_items;

-- Create tenant-scoped read policies
create policy orders_read_by_tenant
on public.orders
for select to authenticated
using (restaurant_id = _jwt_restaurant_id());

create policy order_items_read_by_tenant
on public.order_items
for select to authenticated
using (exists (
  select 1 from public.orders o
  where o.id = order_id 
  and o.restaurant_id = _jwt_restaurant_id()
));

-- Add comments for documentation
comment on policy orders_read_by_tenant on public.orders is 'Restrict orders to authenticated restaurant users';
comment on policy order_items_read_by_tenant on public.order_items is 'Restrict order items to authenticated restaurant users';
