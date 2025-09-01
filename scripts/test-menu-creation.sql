-- Test script for menu creation functionality
-- Run this in Supabase SQL editor to verify the setup

-- 1. Check if menus table exists and has data
SELECT 
  'Menus table status' as check_type,
  COUNT(*) as total_menus,
  COUNT(DISTINCT restaurant_id) as restaurants_with_menus
FROM public.menus;

-- 2. Check RLS policies
SELECT 
  'RLS policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'menus';

-- 3. Test menu creation (this will create a test menu)
INSERT INTO public.menus (restaurant_id, name, slug, description, is_active, is_default, sort_order)
SELECT 
  r.id,
  'Test Menu - ' || NOW()::text,
  'test-menu-' || EXTRACT(EPOCH FROM NOW())::integer,
  'Test menu created at ' || NOW(),
  true,
  false,
  999
FROM public.restaurants r
LIMIT 1
ON CONFLICT (restaurant_id, slug) DO NOTHING;

-- 4. Verify the test menu was created
SELECT 
  'Test menu created' as check_type,
  id,
  name,
  slug,
  restaurant_id,
  created_at
FROM public.menus 
WHERE slug LIKE 'test-menu-%'
ORDER BY created_at DESC
LIMIT 1;

-- 5. Clean up test data
DELETE FROM public.menus WHERE slug LIKE 'test-menu-%';

-- 6. Show final status
SELECT 
  'Final status' as check_type,
  COUNT(*) as total_menus,
  COUNT(DISTINCT restaurant_id) as restaurants_with_menus
FROM public.menus;
