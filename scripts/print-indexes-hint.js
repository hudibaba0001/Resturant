/* eslint-disable no-console */
// Prints the SQL you should run in Supabase to add critical indexes.
console.log(`
-- Run in Supabase SQL editor (safe, IF NOT EXISTS):
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(restaurant_id) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
`);

console.log('\nTip: add more as needed for your hottest queries.');
