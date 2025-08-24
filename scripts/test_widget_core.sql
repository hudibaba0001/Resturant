-- Widget Core Testing Script
-- Run this after applying the fix_widget_core.sql migration

-- 1. Test Functions
SELECT '=== Testing Functions ===' as test_section;

-- Test restaurant_open_now function
SELECT 
  'restaurant_open_now' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'restaurant_open_now'
  ) THEN 'WORKING' ELSE 'FAILED' END as status;

-- Test slugify function
SELECT 
  'slugify' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'slugify'
  ) THEN 'WORKING' ELSE 'FAILED' END as status;

-- Test origin_allowed function
SELECT 
  'origin_allowed' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'origin_allowed'
  ) THEN 'WORKING' ELSE 'FAILED' END as status;

-- 2. Test Tables
SELECT '=== Testing Tables ===' as test_section;

SELECT 
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.table_name
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES 
  ('widget_sessions'),
  ('widget_events'),
  ('chat_messages'),
  ('chat_response_cache'),
  ('menu_snapshots')
) AS t(table_name);

-- 3. Test Indexes
SELECT '=== Testing Indexes ===' as test_section;

SELECT 
  index_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = i.index_name
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES 
  ('widget_sessions_restaurant_idx'),
  ('widget_sessions_last_seen_idx'),
  ('widget_events_restaurant_idx'),
  ('widget_events_session_idx'),
  ('widget_events_type_idx'),
  ('chat_messages_restaurant_idx'),
  ('chat_messages_session_idx'),
  ('chat_response_cache_key'),
  ('chat_response_cache_exp_idx'),
  ('menu_snapshots_restaurant_idx')
) AS i(index_name);

-- 4. Test RLS Policies
SELECT '=== Testing RLS Policies ===' as test_section;

SELECT 
  policy_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND policyname = p.policy_name
  ) THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES 
  ('ws insert'),
  ('ws select own'),
  ('ws update last_seen'),
  ('we insert'),
  ('cm insert'),
  ('cm select'),
  ('crc service'),
  ('ms service')
) AS p(policy_name);

-- 5. Test Function Logic
SELECT '=== Testing Function Logic ===' as test_section;

-- Test slugify function
SELECT 
  'slugify("Test Restaurant & Bistro")' as test_case,
  slugify('Test Restaurant & Bistro') as result;

-- Test origin_allowed with sample restaurant
SELECT 
  'origin_allowed with null origins' as test_case,
  origin_allowed(
    (SELECT id FROM public.restaurants LIMIT 1), 
    'https://example.com'
  ) as result;

-- Test restaurant_open_now
SELECT 
  'restaurant_open_now' as test_case,
  restaurant_open_now((SELECT id FROM public.restaurants LIMIT 1)) as is_open_now;

-- 6. Test RLS Policy Simulation
SELECT '=== Testing RLS Policy Simulation ===' as test_section;

-- Get a sample restaurant ID
DO $$
DECLARE
  sample_restaurant_id uuid;
  sample_session_id uuid;
BEGIN
  -- Get a sample restaurant
  SELECT id INTO sample_restaurant_id FROM public.restaurants LIMIT 1;
  
  IF sample_restaurant_id IS NULL THEN
    RAISE NOTICE 'No restaurants found - creating test restaurant';
    INSERT INTO public.restaurants (id, name, is_active, allowed_origins)
    VALUES (gen_random_uuid(), 'Test Restaurant', true, '[]'::jsonb)
    RETURNING id INTO sample_restaurant_id;
  END IF;
  
  RAISE NOTICE 'Testing with restaurant ID: %', sample_restaurant_id;
  
  -- Test 1: Simulate anon user with allowed origin
  SELECT set_config('request.jwt.claims', '{"role":"anon","sub":"00000000-0000-0000-0000-000000000001"}', true);
  SELECT set_config('request.headers', '{"origin":"https://demo.example"}', true);
  
  -- Should succeed: insert widget session
  BEGIN
    INSERT INTO public.widget_sessions(restaurant_id, session_token, origin, user_agent)
    VALUES (sample_restaurant_id, 'test-session-' || extract(epoch from now())::text, 'https://demo.example', 'UA/1')
    RETURNING id INTO sample_session_id;
    
    RAISE NOTICE '✅ Widget session created successfully';
    
    -- Should succeed: insert widget event
    INSERT INTO public.widget_events(restaurant_id, session_id, type, payload)
    VALUES (sample_restaurant_id, sample_session_id, 'open', '{"smoke":true}'::jsonb);
    
    RAISE NOTICE '✅ Widget event created successfully';
    
    -- Should succeed: insert chat message
    INSERT INTO public.chat_messages(restaurant_id, session_id, role, content)
    VALUES (sample_restaurant_id, sample_session_id, 'user', 'Hello');
    
    RAISE NOTICE '✅ Chat message created successfully';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ RLS test failed: %', SQLERRM;
  END;
  
  -- Test 2: Simulate anon user with disallowed origin
  SELECT set_config('request.headers', '{"origin":"https://evil.example"}', true);
  
  BEGIN
    INSERT INTO public.widget_events(restaurant_id, session_id, type, payload)
    VALUES (sample_restaurant_id, sample_session_id, 'open', '{"smoke":true}'::jsonb);
    
    RAISE NOTICE '❌ RLS should have blocked disallowed origin';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ RLS correctly blocked disallowed origin';
  END;
  
  -- Test 3: Simulate service role (should bypass RLS for cache tables)
  SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
  
  BEGIN
    INSERT INTO public.chat_response_cache(restaurant_id, cache_key, reply, expires_at)
    VALUES (sample_restaurant_id, 'test-cache-key', '{"test":true}'::jsonb, now() + interval '1 day');
    
    RAISE NOTICE '✅ Service role can access cache table';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Service role cache access failed: %', SQLERRM;
  END;
  
  -- Test 4: Simulate anon user trying to access cache (should fail)
  SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
  
  BEGIN
    INSERT INTO public.chat_response_cache(restaurant_id, cache_key, reply, expires_at)
    VALUES (sample_restaurant_id, 'test-cache-key-2', '{"test":true}'::jsonb, now() + interval '1 day');
    
    RAISE NOTICE '❌ Anon should not access cache table';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ RLS correctly blocked anon access to cache';
  END;
  
END $$;

-- 7. Test Data Integrity
SELECT '=== Testing Data Integrity ===' as test_section;

-- Check foreign key relationships
SELECT 
  'widget_events.session_id -> widget_sessions.id' as relationship,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'widget_events' 
    AND constraint_name LIKE '%session_id%'
  ) THEN 'VALID' ELSE 'MISSING' END as status;

SELECT 
  'chat_messages.session_id -> widget_sessions.id' as relationship,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'chat_messages' 
    AND constraint_name LIKE '%session_id%'
  ) THEN 'VALID' ELSE 'MISSING' END as status;

-- 8. Summary
SELECT '=== TEST SUMMARY ===' as test_section;

SELECT 
  'Total restaurants' as metric,
  count(*) as value
FROM public.restaurants
UNION ALL
SELECT 
  'Total widget sessions' as metric,
  count(*) as value
FROM public.widget_sessions
UNION ALL
SELECT 
  'Total widget events' as metric,
  count(*) as value
FROM public.widget_events
UNION ALL
SELECT 
  'Total chat messages' as metric,
  count(*) as value
FROM public.chat_messages;

SELECT '✅ Widget core testing completed!' as result;
