-- Seed Demo Restaurant and Menu Data
-- Run this in Supabase SQL Editor

-- 1. Create restaurant
INSERT INTO public.restaurants (id, name, slug, is_active, is_verified, opening_hours)
VALUES (
  gen_random_uuid(), 'Demo Bistro', 'demo-bistro', true, true,
  jsonb_build_object(
    'monday',  jsonb_build_object('open','09:00','close','17:00'),
    'tuesday', jsonb_build_object('open','09:00','close','17:00'),
    'wednesday',jsonb_build_object('open','09:00','close','17:00'),
    'thursday', jsonb_build_object('open','09:00','close','17:00'),
    'friday',  jsonb_build_object('open','09:00','close','20:00'),
    'saturday',jsonb_build_object('open','10:00','close','16:00'),
    'sunday',  jsonb_build_object('open',null,'close',null)
  )
) RETURNING id;

-- 2. Get the restaurant ID (copy this UUID for RESTAURANT_UUID)
SELECT id as restaurant_id, name, slug 
FROM public.restaurants 
WHERE slug = 'demo-bistro';

-- 3. Create menu section
INSERT INTO public.menu_sections (restaurant_id, name, position)
SELECT id, 'Mains', 0
FROM public.restaurants 
WHERE slug = 'demo-bistro';

-- 4. Create menu items
INSERT INTO public.menu_items (restaurant_id, section_id, name, description, price_cents, currency, tags, is_available)
SELECT 
  r.id as restaurant_id,
  s.id as section_id,
  'Grilled Veggie Bowl' as name,
  'High-protein, vegan bowl with quinoa and roasted vegetables' as description,
  11900 as price_cents,
  'SEK' as currency,
  '["vegan","high-protein"]'::jsonb as tags,
  true as is_available
FROM public.restaurants r
JOIN public.menu_sections s ON s.restaurant_id = r.id
WHERE r.slug = 'demo-bistro' AND s.name = 'Mains'

UNION ALL

SELECT 
  r.id as restaurant_id,
  s.id as section_id,
  'Chicken Caesar Salad' as name,
  'Classic Caesar with grilled chicken, contains dairy' as description,
  12900 as price_cents,
  'SEK' as currency,
  '["contains-dairy","high-protein"]'::jsonb as tags,
  true as is_available
FROM public.restaurants r
JOIN public.menu_sections s ON s.restaurant_id = r.id
WHERE r.slug = 'demo-bistro' AND s.name = 'Mains';

-- 5. Get the item IDs (copy these UUIDs for ITEM_UUID)
SELECT 
  mi.id as item_id, 
  mi.name, 
  mi.price_cents,
  mi.currency
FROM public.menu_items mi
JOIN public.restaurants r ON r.id = mi.restaurant_id
WHERE r.slug = 'demo-bistro';
