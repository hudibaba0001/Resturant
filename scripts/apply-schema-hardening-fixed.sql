-- P0 Pickup Schema Hardening (Fixed for your schema)
-- Run this in Supabase SQL Editor

-- 1. PIN constraint (must be exactly 4 digits)
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_pin_check,
  ADD CONSTRAINT orders_pin_check CHECK (pin ~ '^[0-9]{4}$' OR pin IS NULL);

-- 2. Performance indexes for pickup flow
CREATE INDEX IF NOT EXISTS idx_orders_paid_pin
  ON orders (pin) WHERE status = 'paid' AND pin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
  ON orders(restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_phone 
  ON orders(phone_e164);

CREATE INDEX IF NOT EXISTS idx_orders_email 
  ON orders(lower(email));

-- 3. RLS Policies (simplified for your schema)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop any existing public policies
DROP POLICY IF EXISTS anon_orders_all ON orders;

-- Service role bypasses RLS (for API routes)
-- This is handled automatically by using service role key

-- 4. Verify schema
SELECT 
  'PIN constraint' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'orders_pin_check'
  ) THEN 'OK' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'Paid PIN index' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_orders_paid_pin'
  ) THEN 'OK' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'RLS enabled' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'orders' AND rowsecurity = true
  ) THEN 'OK' ELSE 'MISSING' END as status;
