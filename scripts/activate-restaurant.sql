-- Restaurant Activation SQL Script
-- 
-- Instructions:
-- 1. Replace 'YOUR-RESTAURANT-ID-HERE' with your actual restaurant ID
-- 2. Run this in Supabase SQL Editor
-- 3. Your restaurant ID is shown on the Embed page in your dashboard

-- Step 1: Activate and verify restaurant
UPDATE public.restaurants
SET 
    is_active = true,
    is_verified = true,
    opening_hours = '{
        "monday": {"open": "11:00", "close": "22:00"},
        "tuesday": {"open": "11:00", "close": "22:00"},
        "wednesday": {"open": "11:00", "close": "22:00"},
        "thursday": {"open": "11:00", "close": "22:00"},
        "friday": {"open": "11:00", "close": "23:00"},
        "saturday": {"open": "12:00", "close": "23:00"},
        "sunday": {"open": "12:00", "close": "21:00"}
    }'::jsonb
WHERE id = 'YOUR-RESTAURANT-ID-HERE';

-- Step 2: Add sample menu items
INSERT INTO public.menu_items (
    restaurant_id,
    name,
    description,
    price_cents,
    currency,
    category,
    is_available,
    allergens,
    tags
) VALUES 
    ('YOUR-RESTAURANT-ID-HERE', 'Margherita Pizza', 'Fresh tomato sauce, mozzarella, basil', 9900, 'SEK', 'Mains', true, ARRAY['gluten', 'dairy'], ARRAY['vegetarian', 'popular']),
    ('YOUR-RESTAURANT-ID-HERE', 'Caesar Salad', 'Romaine lettuce, parmesan cheese, croutons, caesar dressing', 7900, 'SEK', 'Salads', true, ARRAY['gluten', 'dairy', 'eggs'], ARRAY['vegetarian', 'healthy']),
    ('YOUR-RESTAURANT-ID-HERE', 'Pasta Carbonara', 'Spaghetti with eggs, cheese, pancetta, black pepper', 8900, 'SEK', 'Mains', true, ARRAY['gluten', 'dairy', 'eggs'], ARRAY['popular', 'creamy']),
    ('YOUR-RESTAURANT-ID-HERE', 'Tiramisu', 'Classic Italian dessert with coffee and mascarpone', 5900, 'SEK', 'Desserts', true, ARRAY['gluten', 'dairy', 'eggs'], ARRAY['dessert', 'coffee']);

-- Step 3: Verify the changes
SELECT 
    id,
    name,
    is_active,
    is_verified,
    opening_hours
FROM public.restaurants 
WHERE id = 'YOUR-RESTAURANT-ID-HERE';

SELECT 
    name,
    price_cents,
    category,
    is_available
FROM public.menu_items 
WHERE restaurant_id = 'YOUR-RESTAURANT-ID-HERE'
ORDER BY category, name;
