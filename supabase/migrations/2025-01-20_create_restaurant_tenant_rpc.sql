-- Create the restaurant tenant RPC function
CREATE OR REPLACE FUNCTION public.create_restaurant_tenant(
  p_name text,
  p_desc text DEFAULT NULL,
  p_cuisine text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_user_id uuid;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create the restaurant
  INSERT INTO public.restaurants (
    name,
    description,
    cuisine_type,
    owner_id,
    is_active,
    is_verified,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_desc,
    p_cuisine,
    v_user_id,
    true,
    false,
    NOW(),
    NOW()
  ) RETURNING id INTO v_restaurant_id;

  -- Create the owner staff record
  INSERT INTO public.restaurant_staff (
    restaurant_id,
    user_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_restaurant_id,
    v_user_id,
    'owner',
    NOW(),
    NOW()
  );

  -- Create a default menu section
  INSERT INTO public.menu_sections (
    restaurant_id,
    name,
    description,
    position,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_restaurant_id,
    'Main Menu',
    'Our main menu items',
    1,
    true,
    NOW(),
    NOW()
  );

  RETURN v_restaurant_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_restaurant_tenant(text, text, text) TO authenticated;
