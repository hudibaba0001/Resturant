-- Create proper menus table for persistent menu storage
-- This fixes the "lazy creation" issue where menus only exist when they have items

-- Create menus table
CREATE TABLE IF NOT EXISTS public.menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique slug per restaurant
  UNIQUE(restaurant_id, slug)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_menus_restaurant_id ON public.menus(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menus_slug ON public.menus(slug);
CREATE INDEX IF NOT EXISTS idx_menus_active ON public.menus(is_active);

-- Enable RLS
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menus
CREATE POLICY "Users can view their own restaurant menus" ON public.menus
  FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own restaurant menus" ON public.menus
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own restaurant menus" ON public.menus
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own restaurant menus" ON public.menus
  FOR DELETE USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants 
      WHERE user_id = auth.uid()
    )
  );

-- Insert default menu for existing restaurants (if needed)
INSERT INTO public.menus (restaurant_id, name, slug, description, is_default, sort_order)
SELECT 
  r.id,
  'Main Menu',
  'main-menu',
  'Default menu for the restaurant',
  true,
  0
FROM public.restaurants r
WHERE NOT EXISTS (
  SELECT 1 FROM public.menus m WHERE m.restaurant_id = r.id
);

-- Update existing menu_items to reference the new menus table
-- This maintains backward compatibility
UPDATE public.menu_items 
SET nutritional_info = COALESCE(nutritional_info, '{}'::jsonb) || 
  jsonb_build_object('menu', 'main-menu')
WHERE nutritional_info->>'menu' IS NULL 
  AND restaurant_id IN (SELECT id FROM public.restaurants);

-- Verify the setup
SELECT 
  'Menus table created successfully' as status,
  COUNT(*) as total_menus,
  COUNT(DISTINCT restaurant_id) as restaurants_with_menus
FROM public.menus;
