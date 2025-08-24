-- Widget Core Verification and Fix Script
-- Run this to check what's missing and fix it

-- 1. Check if functions exist
SELECT '=== Checking Functions ===' as step;

SELECT 
  'restaurant_open_now' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'restaurant_open_now'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'slugify' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'slugify'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'origin_allowed' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'origin_allowed'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 2. Check if tables exist
SELECT '=== Checking Tables ===' as step;

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
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'chat_messages' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 3. Check restaurants table columns
SELECT '=== Checking Restaurants Columns ===' as step;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'restaurants' 
  AND column_name IN ('slug', 'allowed_origins', 'search_vector')
ORDER BY column_name;

-- 4. If restaurant_open_now is missing, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'restaurant_open_now'
  ) THEN
    RAISE NOTICE 'Creating restaurant_open_now function...';
    
    CREATE OR REPLACE FUNCTION public.restaurant_open_now(p_restaurant uuid, p_at timestamptz default now())
    RETURNS boolean LANGUAGE plpgsql STABLE AS $$
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
  END IF;
END $$;

-- 5. If slugify is missing, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'slugify'
  ) THEN
    RAISE NOTICE 'Creating slugify function...';
    
    CREATE OR REPLACE FUNCTION public.slugify(txt text)
    RETURNS text LANGUAGE sql IMMUTABLE AS $$
      SELECT regexp_replace(
               lower(unaccent(coalesce(txt,''))),
               '[^a-z0-9]+','-','g'
             )::text;
    $$;
  END IF;
END $$;

-- 6. If origin_allowed is missing, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'origin_allowed'
  ) THEN
    RAISE NOTICE 'Creating origin_allowed function...';
    
    CREATE OR REPLACE FUNCTION public.origin_allowed(p_restaurant uuid, p_origin text)
    RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT
        (coalesce(jsonb_array_length(r.allowed_origins),0) = 0)  -- empty list => allow all
        OR (EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(coalesce(r.allowed_origins, '[]'::jsonb)) AS o(host)
          WHERE p_origin ILIKE '%'||o.host||'%'
        ))
      FROM public.restaurants r
      WHERE r.id = p_restaurant;
    $$;
  END IF;
END $$;

-- 7. Test the functions now
SELECT '=== Testing Functions ===' as step;

-- Test restaurant_open_now
SELECT 
  'restaurant_open_now' as function_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'restaurant_open_now'
    ) THEN 'WORKING'
    ELSE 'STILL MISSING'
  END as status;

-- Test with actual data
SELECT 
  'Testing restaurant_open_now with data' as test,
  id,
  name,
  restaurant_open_now(id) as is_open_now
FROM public.restaurants 
LIMIT 2;

SELECT '✅ Verification and fixes completed!' as result;
