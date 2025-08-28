-- 2025-01-28_order_items_integrity.sql
-- Add FK constraint and index for order_items integrity

BEGIN;

-- FK constraint (should exist already, but safe to ensure)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_item_fk' 
    AND table_name = 'order_items'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_item_fk 
      FOREIGN KEY (item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index for fast nested fetch
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);

COMMIT;
