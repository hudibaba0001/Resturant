-- Dashboard performance indexes
-- Add indexes for faster dashboard queries

-- Menu items list/search performance
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant 
ON public.menu_items(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_available 
ON public.menu_items(restaurant_id, is_available);

CREATE INDEX IF NOT EXISTS idx_menu_items_section 
ON public.menu_items(restaurant_id, section_id);

-- Orders list/KPIs performance
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created 
ON public.orders(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status 
ON public.orders(restaurant_id, status, created_at DESC);

-- Restaurant staff lookup performance
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_user 
ON public.restaurant_staff(user_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_staff_restaurant 
ON public.restaurant_staff(restaurant_id);

-- Menu sections performance
CREATE INDEX IF NOT EXISTS idx_menu_sections_restaurant 
ON public.menu_sections(restaurant_id, position);
