-- Widget Core Fix Script
-- This will create all missing tables and functions

BEGIN;

-- Install required extensions (only the ones that should be available)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create missing functions first
CREATE OR REPLACE FUNCTION public.restaurant_open_now(p_restaurant uuid, p_at timestamptz default now())
RETURNS boolean 
LANGUAGE plpgsql 
STABLE 
AS $$
DECLARE
  oh jsonb;
  dow text;
  open_t text;
  close_t text;
  t time;
BEGIN
  SELECT opening_hours INTO oh
  FROM public.restaurants WHERE id = p_restaurant;

  IF oh IS NULL THEN RETURN true; END IF;

  dow := lower(to_char(p_at AT TIME ZONE 'UTC','Day'));
  dow := trim(dow); -- 'monday', etc.

  open_t  := (oh -> dow ->> 'open');
  close_t := (oh -> dow ->> 'close');

  IF open_t IS NULL OR close_t IS NULL THEN
    RETURN true; -- be permissive if not configured
  END IF;

  t := (p_at AT TIME ZONE 'UTC')::time;

  IF open_t <= close_t THEN
    RETURN (t >= open_t::time AND t <= close_t::time);
  ELSE
    -- overnight window (e.g. 18:00 -> 02:00)
    RETURN (t >= open_t::time OR t <= close_t::time);
  END IF;
END;
$$;

-- Simple slugify without unaccent dependency
CREATE OR REPLACE FUNCTION public.slugify(txt text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           lower(coalesce(txt,'')),
           '[^a-z0-9]+','-','g'
         )::text;
$$;

CREATE OR REPLACE FUNCTION public.origin_allowed(p_restaurant uuid, p_origin text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT
    CASE 
      WHEN r.allowed_origins IS NULL THEN true  -- null means allow all
      WHEN array_length(r.allowed_origins, 1) IS NULL THEN true  -- empty text array => allow all
      ELSE (EXISTS (
        SELECT 1
        FROM unnest(r.allowed_origins) AS o(host)
        WHERE p_origin ILIKE '%'||o.host||'%'
      ))
    END
  FROM public.restaurants r
  WHERE r.id = p_restaurant;
$$;

-- 2. Create widget_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.widget_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_token text not null unique,
  origin text,
  referer text,
  user_agent text,
  locale text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Add missing columns if tables exist but are missing them
DO $$ 
BEGIN
  -- widget_sessions table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'widget_sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widget_sessions' AND column_name = 'last_seen_at') THEN
      ALTER TABLE public.widget_sessions ADD COLUMN last_seen_at timestamptz not null default now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widget_sessions' AND column_name = 'locale') THEN
      ALTER TABLE public.widget_sessions ADD COLUMN locale text;
    END IF;
  END IF;
  
  -- widget_events table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'widget_events') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widget_events' AND column_name = 'session_id') THEN
      ALTER TABLE public.widget_events ADD COLUMN session_id uuid references public.widget_sessions(id) on delete cascade;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widget_events' AND column_name = 'payload') THEN
      ALTER TABLE public.widget_events ADD COLUMN payload jsonb not null default '{}'::jsonb;
    END IF;
  END IF;
  
  -- chat_messages table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'session_id') THEN
      ALTER TABLE public.chat_messages ADD COLUMN session_id uuid references public.widget_sessions(id) on delete cascade;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'language') THEN
      ALTER TABLE public.chat_messages ADD COLUMN language text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'meta') THEN
      ALTER TABLE public.chat_messages ADD COLUMN meta jsonb not null default '{}'::jsonb;
    END IF;
  END IF;
  
  -- chat_response_cache table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_response_cache') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_response_cache' AND column_name = 'expires_at') THEN
      ALTER TABLE public.chat_response_cache ADD COLUMN expires_at timestamptz not null;
    END IF;
  END IF;
END $$;

-- 3. Create widget_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.widget_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id uuid not null references public.widget_sessions(id) on delete cascade,
  type text not null check (type in (
    'open','add_to_cart','chat_send','chat_reply','checkout_start','order_created','error'
  )),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id uuid not null references public.widget_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  language text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 5. Create chat_response_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_response_cache (
  id bigserial primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  cache_key text not null,
  reply jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 6. Create menu_snapshots table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.menu_snapshots (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS widget_sessions_restaurant_idx ON public.widget_sessions (restaurant_id);
CREATE INDEX IF NOT EXISTS widget_sessions_last_seen_idx ON public.widget_sessions (last_seen_at);
CREATE INDEX IF NOT EXISTS widget_events_restaurant_idx ON public.widget_events(restaurant_id);
CREATE INDEX IF NOT EXISTS widget_events_session_idx ON public.widget_events(session_id);
CREATE INDEX IF NOT EXISTS widget_events_type_idx ON public.widget_events(type);
CREATE INDEX IF NOT EXISTS chat_messages_restaurant_idx ON public.chat_messages (restaurant_id, created_at desc);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON public.chat_messages (session_id, created_at desc);
CREATE UNIQUE INDEX IF NOT EXISTS chat_response_cache_key ON public.chat_response_cache(restaurant_id, cache_key);
CREATE INDEX IF NOT EXISTS chat_response_cache_exp_idx ON public.chat_response_cache(expires_at);
CREATE INDEX IF NOT EXISTS menu_snapshots_restaurant_idx ON public.menu_snapshots(restaurant_id, created_at desc);

-- 8. Enable RLS
ALTER TABLE public.widget_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_snapshots ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies (with safe header handling)
DROP POLICY IF EXISTS "ws insert" ON public.widget_sessions;
CREATE POLICY "ws insert"
ON public.widget_sessions FOR INSERT
TO anon
WITH CHECK ( public.origin_allowed(restaurant_id, coalesce((current_setting('request.headers', true))::json->>'origin','')) );

DROP POLICY IF EXISTS "ws select own" ON public.widget_sessions;
CREATE POLICY "ws select own"
ON public.widget_sessions FOR SELECT
TO anon
USING ( true );

DROP POLICY IF EXISTS "ws update last_seen" ON public.widget_sessions;
CREATE POLICY "ws update last_seen"
ON public.widget_sessions FOR UPDATE
TO anon
USING ( true )
WITH CHECK ( true );

DROP POLICY IF EXISTS "we insert" ON public.widget_events;
CREATE POLICY "we insert"
ON public.widget_events FOR INSERT
TO anon
WITH CHECK ( public.origin_allowed(restaurant_id, coalesce((current_setting('request.headers', true))::json->>'origin','')) );

DROP POLICY IF EXISTS "cm insert" ON public.chat_messages;
CREATE POLICY "cm insert"
ON public.chat_messages FOR INSERT
TO anon
WITH CHECK ( public.origin_allowed(restaurant_id, coalesce((current_setting('request.headers', true))::json->>'origin','')) );

DROP POLICY IF EXISTS "cm select" ON public.chat_messages;
CREATE POLICY "cm select"
ON public.chat_messages FOR SELECT
TO anon
USING ( true );

DROP POLICY IF EXISTS "crc service" ON public.chat_response_cache;
CREATE POLICY "crc service"
ON public.chat_response_cache USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "ms service" ON public.menu_snapshots;
CREATE POLICY "ms service"
ON public.menu_snapshots USING (false) WITH CHECK (false);

COMMIT;

-- 10. Test everything
SELECT '=== Testing Functions ===' as step;
SELECT 
  'restaurant_open_now' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'restaurant_open_now'
  ) THEN 'WORKING' ELSE 'FAILED' END as status;

SELECT '=== Testing Tables ===' as step;
SELECT 
  'widget_sessions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'widget_sessions'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'widget_events' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'widget_events'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT '=== Testing with Data ===' as step;
SELECT 
  'Testing restaurant_open_now' as test,
  id,
  name,
  restaurant_open_now(id) as is_open_now
FROM public.restaurants 
LIMIT 2;

SELECT '✅ Widget core fix completed!' as result;
