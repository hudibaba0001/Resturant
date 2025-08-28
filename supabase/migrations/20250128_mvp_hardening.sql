-- 2025-01-28_mvp_hardening.sql
-- MVP Schema Hardening: Security, Performance, GDPR Compliance
-- Addresses: PII hashing, tenant isolation, vector search, FTS, retention

BEGIN;

-- ============================================================================
-- 0. EXTENSIONS (if not already present)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- digest(), crypt()
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. FIX EMBEDDINGS FK/TYPE + INDEX
-- ============================================================================

-- Ensure item_id matches menu_items.id and cascades with tenant safety
ALTER TABLE public.menu_item_embeddings
  ALTER COLUMN item_id TYPE uuid USING item_id::uuid;

ALTER TABLE public.menu_item_embeddings
  ADD CONSTRAINT menu_item_embeddings_item_fk
  FOREIGN KEY (item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

-- Vector index (HNSW for better filtering)
CREATE INDEX IF NOT EXISTS menu_item_embeddings_hnsw
  ON public.menu_item_embeddings USING hnsw (embedding vector_l2_ops)
  WITH (m=16, ef_construction=64);

-- Helpful filter index
CREATE INDEX IF NOT EXISTS menu_item_embeddings_restaurant_idx
  ON public.menu_item_embeddings (restaurant_id);

-- ============================================================================
-- 2. HASH SECRETS (PINs, session tokens) - GDPR COMPLIANCE
-- ============================================================================

-- Orders PIN → hash + drop plaintext
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pin_hash text;

-- Backfill existing PINs with hashes
UPDATE public.orders
SET pin_hash = CASE WHEN pin IS NOT NULL THEN crypt(pin, gen_salt('bf')) END
WHERE pin IS NOT NULL AND pin_hash IS NULL;

-- Drop plaintext PIN column
ALTER TABLE public.orders DROP COLUMN IF EXISTS pin;

-- Index for PIN verification
CREATE INDEX IF NOT EXISTS orders_pin_issued_at_idx ON public.orders (pin_issued_at);

-- Session token → store only hash
ALTER TABLE public.widget_sessions ADD COLUMN IF NOT EXISTS session_token_hash bytea;

-- Backfill existing session tokens with hashes
UPDATE public.widget_sessions
SET session_token_hash = digest(session_token, 'sha256')
WHERE session_token IS NOT NULL AND session_token_hash IS NULL;

-- Replace uniqueness constraint with hash
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'widget_sessions_session_token_key'
  ) THEN
    ALTER TABLE public.widget_sessions DROP CONSTRAINT widget_sessions_session_token_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS widget_sessions_token_hash_key
  ON public.widget_sessions (session_token_hash);

-- ============================================================================
-- 3. CACHE INTEGRITY & TTL
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS chat_response_cache_rest_key_unique
  ON public.chat_response_cache (restaurant_id, cache_key);

CREATE INDEX IF NOT EXISTS chat_response_cache_expires_idx
  ON public.chat_response_cache (expires_at);

-- ============================================================================
-- 4. FULL-TEXT SEARCH COLUMNS + TRIGGERS
-- ============================================================================

-- Restaurants FTS
CREATE OR REPLACE FUNCTION public.restaurants_fts_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.city,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'C');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tsv_restaurants ON public.restaurants;
CREATE TRIGGER tsv_restaurants
BEFORE INSERT OR UPDATE ON public.restaurants
FOR EACH ROW EXECUTE PROCEDURE public.restaurants_fts_trigger();

CREATE INDEX IF NOT EXISTS restaurants_fts_idx
  ON public.restaurants USING GIN (search_vector);

-- Menu items FTS
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.menu_items_fts_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.category,'')), 'C');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tsv_menu_items ON public.menu_items;
CREATE TRIGGER tsv_menu_items
BEFORE INSERT OR UPDATE ON public.menu_items
FOR EACH ROW EXECUTE PROCEDURE public.menu_items_fts_trigger();

CREATE INDEX IF NOT EXISTS menu_items_fts_idx
  ON public.menu_items USING GIN (search_vector);

-- ============================================================================
-- 5. CORE INDEXES (FKs + HOT PATHS)
-- ============================================================================

-- Foreign Keys
CREATE INDEX IF NOT EXISTS menu_items_restaurant_idx ON public.menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS orders_restaurant_idx ON public.orders (restaurant_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON public.chat_messages (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS widget_events_restaurant_created_idx ON public.widget_events (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS widget_sessions_restaurant_seen_idx ON public.widget_sessions (restaurant_id, last_seen_at DESC);

-- Commerce/status
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON public.orders (status, created_at DESC);

-- Payments integrity
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_cs_unique ON public.orders (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_pi_unique ON public.orders (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================================
-- 6. RLS POLICIES (TIGHT, TENANT-SAFE)
-- ============================================================================

-- Menu items: public read only if restaurant is active; staff can read/write
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_items_public_read ON public.menu_items;
CREATE POLICY menu_items_public_read
ON public.menu_items FOR SELECT
USING (
  is_available = true
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = menu_items.restaurant_id AND r.is_active = true
  )
);

DROP POLICY IF EXISTS menu_items_staff_rw ON public.menu_items;
CREATE POLICY menu_items_staff_rw
ON public.menu_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = menu_items.restaurant_id
      AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = menu_items.restaurant_id
      AND s.user_id = auth.uid()
  )
);

-- Orders: staff can read/write; public can create (through API)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_staff_rw ON public.orders;
CREATE POLICY orders_staff_rw
ON public.orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = orders.restaurant_id
      AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = orders.restaurant_id
      AND s.user_id = auth.uid()
  )
);

-- Order items: staff can read/write
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_items_staff_rw ON public.order_items;
CREATE POLICY order_items_staff_rw
ON public.order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.restaurant_staff s ON s.restaurant_id = o.restaurant_id
    WHERE o.id = order_items.order_id
      AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.restaurant_staff s ON s.restaurant_id = o.restaurant_id
    WHERE o.id = order_items.order_id
      AND s.user_id = auth.uid()
  )
);

-- Chat messages: service role only (widget writes through API)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_messages_service_only ON public.chat_messages;
CREATE POLICY chat_messages_service_only
ON public.chat_messages FOR ALL
USING (false)
WITH CHECK (false);

-- Widget events: service role only (widget writes through API)
ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS widget_events_service_only ON public.widget_events;
CREATE POLICY widget_events_service_only
ON public.widget_events FOR ALL
USING (false)
WITH CHECK (false);

-- Widget sessions: service role only (widget writes through API)
ALTER TABLE public.widget_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS widget_sessions_service_only ON public.widget_sessions;
CREATE POLICY widget_sessions_service_only
ON public.widget_sessions FOR ALL
USING (false)
WITH CHECK (false);

-- Chat response cache: service role only
ALTER TABLE public.chat_response_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_response_cache_service_only ON public.chat_response_cache;
CREATE POLICY chat_response_cache_service_only
ON public.chat_response_cache FOR ALL
USING (false)
WITH CHECK (false);

-- Menu item embeddings: service role only
ALTER TABLE public.menu_item_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_item_embeddings_service_only ON public.menu_item_embeddings;
CREATE POLICY menu_item_embeddings_service_only
ON public.menu_item_embeddings FOR ALL
USING (false)
WITH CHECK (false);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- PIN verification (server-side RPC only)
CREATE OR REPLACE FUNCTION public.verify_order_pin(p_order uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE ok boolean;
BEGIN
  SELECT (o.pin_issued_at IS NOT NULL AND o.pin_issued_at > now() - interval '2 hours')
         AND crypt(p_pin, o.pin_hash) = o.pin_hash
  INTO ok
  FROM public.orders o
  WHERE o.id = p_order;
  RETURN coalesce(ok, false);
END $$;

-- Session token verification
CREATE OR REPLACE FUNCTION public.verify_session_token(p_restaurant_id uuid, p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE session_id uuid;
BEGIN
  SELECT ws.id INTO session_id
  FROM public.widget_sessions ws
  WHERE ws.restaurant_id = p_restaurant_id
    AND ws.session_token_hash = digest(p_token, 'sha256')
    AND ws.last_seen_at > now() - interval '24 hours';
  RETURN session_id;
END $$;

-- ============================================================================
-- 8. DATA QUALITY CHECKS
-- ============================================================================

-- Phone number format validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'phone_e164_format' 
    AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT phone_e164_format 
      CHECK (phone_e164 ~ '^[+][1-9][0-9]{7,14}$' OR phone_e164 IS NULL);
  END IF;
END $$;

-- Currency ISO3 validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'currency_iso3' 
    AND conrelid = 'public.menu_items'::regclass
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT currency_iso3 
      CHECK (char_length(currency) = 3);
  END IF;
END $$;

-- ============================================================================
-- 9. RETENTION READY (COMMENTED - ENABLE WITH pg_cron)
-- ============================================================================

-- If pg_cron is available, uncomment these:
/*
-- 03:00 nightly: purge expired cache
SELECT cron.schedule('purge_cache', '0 3 * * *',
$$DELETE FROM public.chat_response_cache WHERE expires_at < now();$$);

-- 03:10 nightly: purge old chat messages (30 days)
SELECT cron.schedule('purge_chat', '10 3 * * *',
$$DELETE FROM public.chat_messages WHERE created_at < now() - interval '30 days';$$);

-- 03:20 nightly: purge old widget events (90 days)
SELECT cron.schedule('purge_events', '20 3 * * *',
$$DELETE FROM public.widget_events WHERE created_at < now() - interval '90 days';$$);

-- 03:30 nightly: purge old widget sessions (7 days)
SELECT cron.schedule('purge_sessions', '30 3 * * *',
$$DELETE FROM public.widget_sessions WHERE last_seen_at < now() - interval '7 days';$$);
*/

-- ============================================================================
-- 10. ROLLBACK BLOCK (SAFETY)
-- ============================================================================

-- If you need to rollback, run this:
/*
-- Restore plaintext PINs (if needed)
ALTER TABLE public.orders ADD COLUMN pin text;
UPDATE public.orders SET pin = '0000' WHERE pin_hash IS NOT NULL; -- temporary

-- Restore plaintext session tokens (if needed)
ALTER TABLE public.widget_sessions ADD COLUMN session_token text;
UPDATE public.widget_sessions SET session_token = 'temp' WHERE session_token_hash IS NOT NULL; -- temporary

-- Drop new indexes
DROP INDEX IF EXISTS menu_item_embeddings_hnsw;
DROP INDEX IF EXISTS chat_response_cache_rest_key_unique;
DROP INDEX IF EXISTS restaurants_fts_idx;
DROP INDEX IF EXISTS menu_items_fts_idx;

-- Drop new constraints
ALTER TABLE public.menu_item_embeddings DROP CONSTRAINT IF EXISTS menu_item_embeddings_item_fk;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS phone_e164_format;
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS currency_iso3;
*/

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'MVP hardening migration completed successfully!' as status;
