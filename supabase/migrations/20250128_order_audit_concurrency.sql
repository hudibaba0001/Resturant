-- 2025-01-28_order_audit_concurrency.sql
-- Add audit trail and concurrency protection for order status changes

BEGIN;

-- 1) Audit table for status changes
CREATE TABLE IF NOT EXISTS public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  from_status text NOT NULL CHECK (from_status IN ('pending','paid','preparing','ready','completed','cancelled','expired')),
  to_status   text NOT NULL CHECK (to_status   IN ('pending','paid','preparing','ready','completed','cancelled','expired')),
  reason text,
  changed_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS order_status_events_order_idx ON public.order_status_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_status_events_restaurant_idx ON public.order_status_events(restaurant_id, created_at DESC);

-- 2) RLS policies for audit table
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

-- Staff (editor+) can read their restaurant's events
DROP POLICY IF EXISTS ose_staff_select ON public.order_status_events;
CREATE POLICY ose_staff_select
ON public.order_status_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = order_status_events.restaurant_id
      AND s.user_id = auth.uid()
      AND s.role IN ('owner','manager','editor')
  )
);

-- Insert policy ensures integrity: same restaurant, real staff, and changed_by = auth.uid()
DROP POLICY IF EXISTS ose_staff_insert ON public.order_status_events;
CREATE POLICY ose_staff_insert
ON public.order_status_events
FOR INSERT
WITH CHECK (
  auth.uid() = changed_by
  AND EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = order_status_events.restaurant_id
      AND s.user_id = auth.uid()
      AND s.role IN ('owner','manager','editor')
  )
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_events.order_id
      AND o.restaurant_id = order_status_events.restaurant_id
  )
);

COMMIT;
