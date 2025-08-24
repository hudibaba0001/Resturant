-- Test Menu Tables
-- Check if menu_sections and menu_items tables exist

SELECT '=== Checking Menu Tables ===' as test_section;

-- Check if menu_sections table exists
SELECT 
  'menu_sections' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'menu_sections'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if menu_items table exists
SELECT 
  'menu_items' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'menu_items'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- If tables exist, show sample data
SELECT '=== Sample Data (if tables exist) ===' as test_section;

-- Sample menu sections
SELECT 
  'menu_sections count' as metric,
  count(*) as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'menu_sections'
UNION ALL
SELECT 
  'menu_items count' as metric,
  count(*) as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'menu_items';

-- Show all tables in public schema
SELECT '=== All Tables in Public Schema ===' as test_section;
SELECT 
  table_name,
  CASE WHEN table_name IN ('menu_sections', 'menu_items') THEN 'MENU TABLE' ELSE 'OTHER' END as type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
