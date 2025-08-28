-- 2025-01-28_order_status_rls.sql
-- RLS policies for order status management by staff

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow staff (editor or higher) to read orders for their restaurant
DROP POLICY IF EXISTS orders_staff_select ON public.orders;
CREATE POLICY orders_staff_select
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = orders.restaurant_id
      AND s.user_id = auth.uid()
      AND s.role IN ('owner','manager','editor')
  )
);

-- Allow staff (editor or higher) to update orders (we only update status in our API)
DROP POLICY IF EXISTS orders_staff_update ON public.orders;
CREATE POLICY orders_staff_update
ON public.orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = orders.restaurant_id
      AND s.user_id = auth.uid()
      AND s.role IN ('owner','manager','editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = orders.restaurant_id
      AND s.user_id = auth.uid()
      AND s.role IN ('owner','manager','editor')
  )
);

COMMIT;
