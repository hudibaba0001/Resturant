-- RLS Audit and Security Hardening
-- Verify RLS policies are working correctly

-- Test RLS policies (run these manually in SQL editor)
-- 1. Test unauthenticated access (should be denied)
-- BEGIN;
-- SET LOCAL ROLE none;
-- -- These should all fail due to RLS
-- SELECT * FROM public.menu_items LIMIT 1;
-- SELECT * FROM public.orders LIMIT 1;
-- SELECT * FROM public.restaurants LIMIT 1;
-- ROLLBACK;

-- 2. Verify restaurant_staff policies
-- Users should only see their own restaurant access
-- SELECT * FROM public.restaurant_staff WHERE user_id = auth.uid();

-- 3. Verify menu_items policies  
-- Users should only see items from restaurants they have access to
-- SELECT * FROM public.menu_items WHERE restaurant_id IN (
--   SELECT restaurant_id FROM public.restaurant_staff WHERE user_id = auth.uid()
-- );

-- 4. Verify orders policies
-- Users should only see orders from their restaurants
-- SELECT * FROM public.orders WHERE restaurant_id IN (
--   SELECT restaurant_id FROM public.restaurant_staff WHERE user_id = auth.uid()
-- );

-- 5. Verify restaurants policies
-- Users should only see restaurants they have access to
-- SELECT * FROM public.restaurants WHERE id IN (
--   SELECT restaurant_id FROM public.restaurant_staff WHERE user_id = auth.uid()
-- );

-- Additional security: Ensure all tables have RLS enabled
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_cuisines ENABLE ROW LEVEL SECURITY;
