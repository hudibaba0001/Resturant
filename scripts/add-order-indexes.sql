-- Fast reads in dashboard
create index if not exists idx_orders_restaurant_created
  on public.orders (restaurant_id, created_at desc);

create index if not exists idx_order_items_order
  on public.order_items (order_id);

-- Ensure order_code uniqueness per restaurant
create unique index if not exists orders_restaurant_code_uidx
  on public.orders (restaurant_id, order_code);

-- Add comment for documentation
comment on index idx_orders_restaurant_created is 'Fast dashboard queries by restaurant and date';
comment on index idx_order_items_order is 'Fast order item lookups';
comment on index orders_restaurant_code_uidx is 'Prevent duplicate order codes per restaurant';
