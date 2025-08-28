-- 2025-01-28_order_items_rls.sql
-- Add RLS policies for order_items and menu_items so staff can see order line items

BEGIN;

-- 1) Order items: allow staff to SELECT their restaurant's order lines
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_items_staff_select ON public.order_items;
CREATE POLICY order_items_staff_select
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.restaurant_staff s
      ON s.restaurant_id = o.restaurant_id
     AND s.user_id = auth.uid()
     AND s.role IN ('owner','manager','editor')
    WHERE o.id = order_items.order_id
  )
);

-- 2) Menu items: ensure staff can see items regardless of availability
-- (Keep your public-read policy for the widget; this adds a staff-only lane.)
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_items_staff_select ON public.menu_items;
CREATE POLICY menu_items_staff_select
ON public.menu_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = menu_items.restaurant_id
      AND s.user_id = auth.uid()
      AND s.role IN ('owner','manager','editor')
  )
);

COMMIT;
