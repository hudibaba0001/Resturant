-- Widget Core Smoke Tests
-- Run this after applying the migration to verify everything works

-- 1. Verify slug + search functionality
SELECT '=== Testing slug + search ===' as test;
SELECT id, name, slug, search_vector 
FROM public.restaurants 
LIMIT 3;

-- 2. Test restaurant_open_now function
SELECT '=== Testing restaurant_open_now ===' as test;
SELECT 
  id,
  name,
  restaurant_open_now(id) as is_open_now,
  restaurant_open_now(id, now() + interval '1 hour') as is_open_in_1_hour
FROM public.restaurants 
LIMIT 3;

-- 3. Create a test session
SELECT '=== Testing session creation ===' as test;
INSERT INTO public.widget_sessions (
  restaurant_id, 
  session_token, 
  origin, 
  user_agent
) VALUES (
  (SELECT id FROM public.restaurants LIMIT 1),
  'smoke-test-session-' || extract(epoch from now())::text,
  'https://example.com',
  'SmokeTest/1.0'
) ON CONFLICT (session_token) DO NOTHING;

-- 4. Verify session was created
SELECT '=== Verifying session ===' as test;
SELECT 
  id,
  restaurant_id,
  session_token,
  origin,
  created_at,
  last_seen_at
FROM public.widget_sessions 
WHERE session_token LIKE 'smoke-test-session-%'
ORDER BY created_at DESC
LIMIT 1;

-- 5. Log a test event
SELECT '=== Testing event logging ===' as test;
INSERT INTO public.widget_events (
  restaurant_id, 
  session_id, 
  type, 
  payload
) SELECT 
  restaurant_id,
  id,
  'open',
  '{"source":"smoke_test","timestamp":"' || now()::text || '"}'
FROM public.widget_sessions 
WHERE session_token LIKE 'smoke-test-session-%'
ORDER BY created_at DESC
LIMIT 1;

-- 6. Verify event was logged
SELECT '=== Verifying event ===' as test;
SELECT 
  we.id,
  we.type,
  we.payload,
  we.created_at,
  ws.session_token
FROM public.widget_events we
JOIN public.widget_sessions ws ON we.session_id = ws.id
WHERE ws.session_token LIKE 'smoke-test-session-%'
ORDER BY we.created_at DESC
LIMIT 3;

-- 7. Test origin_allowed function
SELECT '=== Testing origin_allowed ===' as test;
SELECT 
  id,
  name,
  origin_allowed(id, 'https://example.com') as allows_example,
  origin_allowed(id, 'https://malicious.com') as allows_malicious,
  allowed_origins
FROM public.restaurants 
LIMIT 3;

-- 8. Test slugify function
SELECT '=== Testing slugify ===' as test;
SELECT 
  'Test Restaurant Name' as original,
  slugify('Test Restaurant Name') as slugified,
  slugify('Café & Bistro (Downtown)') as with_special_chars;

-- 9. Summary
SELECT '=== SMOKE TEST SUMMARY ===' as test;
SELECT 
  'restaurants' as table_name,
  count(*) as row_count
FROM public.restaurants
UNION ALL
SELECT 
  'widget_sessions' as table_name,
  count(*) as row_count
FROM public.widget_sessions
UNION ALL
SELECT 
  'widget_events' as table_name,
  count(*) as row_count
FROM public.widget_events;

SELECT '✅ All smoke tests completed successfully!' as result;
