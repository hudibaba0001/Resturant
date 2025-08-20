-- Database Fixes Patch
-- Apply this AFTER running the main schema migration

-- 0) Required: Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Fix user FKs to Supabase auth schema (if you do NOT maintain a public.users table)
ALTER TABLE public.restaurant_staff
  DROP CONSTRAINT IF EXISTS restaurant_staff_user_id_fkey,
  ADD CONSTRAINT restaurant_staff_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_owner_id_fkey,
  ADD CONSTRAINT restaurants_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2) Harden SECURITY DEFINER function
CREATE OR REPLACE FUNCTION has_restaurant_permission(
  user_uuid uuid,
  restaurant_uuid uuid,
  required_role varchar
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role varchar;
  role_hierarchy jsonb := '{"owner":4,"manager":3,"editor":2,"viewer":1}'::jsonb;
BEGIN
  -- Owner has all permissions
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_uuid AND owner_id = user_uuid) THEN
    RETURN true;
  END IF;
  
  -- Check staff role
  SELECT role INTO user_role
  FROM public.restaurant_staff
  WHERE restaurant_id = restaurant_uuid AND user_id = user_uuid;
  
  IF user_role IS NULL THEN 
    RETURN false; 
  END IF;
  
  -- Compare role hierarchy
  RETURN (role_hierarchy->>user_role)::int >= (role_hierarchy->>required_role)::int;
END $$;

-- 3) Add WITH CHECK so inserts/updates are allowed under the same rule
DROP POLICY IF EXISTS "Users can manage cuisines for own restaurants" ON public.restaurant_cuisines;
CREATE POLICY "Users can manage cuisines for own restaurants" ON public.restaurant_cuisines
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = restaurant_cuisines.restaurant_id
      AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'editor'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = restaurant_cuisines.restaurant_id
      AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'editor'))
  )
);

DROP POLICY IF EXISTS "Owners can manage staff" ON public.restaurant_staff;
CREATE POLICY "Owners can manage staff" ON public.restaurant_staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = restaurant_staff.restaurant_id AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = restaurant_staff.restaurant_id AND r.owner_id = auth.uid()
  )
);

-- 4) Add updated_at triggers to all timestamped tables
CREATE TRIGGER tg_cuisines_updated
  BEFORE UPDATE ON public.cuisines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tg_restaurant_staff_updated
  BEFORE UPDATE ON public.restaurant_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tg_restaurant_cuisines_updated
  BEFORE UPDATE ON public.restaurant_cuisines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5) Quick sanity checks (run these to verify fixes work)
-- Note: These will fail if you don't have a test user, but they show the pattern

-- Test 1: Insert a staff member as the owner → should succeed (proves WITH CHECK)
-- (Uncomment and run with a real user_id when you have one)
/*
INSERT INTO public.restaurant_staff (restaurant_id, user_id, role)
SELECT r.id, auth.uid(), 'manager'
FROM public.restaurants r
WHERE r.owner_id = auth.uid()
LIMIT 1;
*/

-- Test 2: Non-owner without editor role can't modify restaurant rows → should be denied (RLS)
-- (This will fail as expected for non-owners)

-- Test 3: insert into restaurant_cuisines works for owner/editor; fails for others
-- (This will work for owners, fail for non-owners)

PRINT '✅ Database fixes applied successfully!';
PRINT '📋 Next: Run the demo data creation script';
