-- Database Architectural Refinements
-- Implementing critical improvements for consistency, efficiency, and data integrity

-- 1) Create ENUM types for better data integrity
CREATE TYPE order_status_enum AS ENUM ('pending', 'paid', 'cancelled', 'fulfilled', 'refunded');
CREATE TYPE order_type_enum AS ENUM ('pickup', 'delivery', 'dine_in');
CREATE TYPE staff_role_enum AS ENUM ('owner', 'manager', 'editor', 'viewer');
CREATE TYPE widget_event_type_enum AS ENUM ('widget_open', 'chat', 'add_to_cart', 'checkout_start', 'order_created', 'order_failed');
CREATE TYPE chat_message_role_enum AS ENUM ('user', 'assistant', 'tool');

-- 2) Update restaurants table
ALTER TABLE public.restaurants 
  DROP COLUMN IF EXISTS cuisine_type,
  ALTER COLUMN country SET DEFAULT 'SE',
  ADD CONSTRAINT restaurants_slug_unique UNIQUE (slug);

-- 3) Update menu_items table (if it exists)
DO $$
BEGIN
  -- Check if menu_items table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items') THEN
    -- Remove redundant columns
    ALTER TABLE public.menu_items 
      DROP COLUMN IF EXISTS price,
      DROP COLUMN IF EXISTS category;
    
    -- Ensure price_cents is the primary price field
    ALTER TABLE public.menu_items 
      ALTER COLUMN price_cents SET NOT NULL;
  END IF;
END $$;

-- 4) Update orders table with ENUM types
ALTER TABLE public.orders 
  ALTER COLUMN status TYPE order_status_enum USING status::order_status_enum,
  ALTER COLUMN type TYPE order_type_enum USING type::order_type_enum;

-- 5) Update restaurant_staff table with ENUM type
ALTER TABLE public.restaurant_staff 
  ALTER COLUMN role TYPE staff_role_enum USING role::staff_role_enum;

-- 6) Update widget_events table with ENUM type
ALTER TABLE public.widget_events 
  ALTER COLUMN type TYPE widget_event_type_enum USING type::widget_event_type_enum;

-- 7) Update chat_messages table with ENUM type
ALTER TABLE public.chat_messages 
  ALTER COLUMN role TYPE chat_message_role_enum USING role::chat_message_role_enum;

-- 8) Add missing constraints and indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_country ON public.restaurants(country);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON public.orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON public.orders(restaurant_id, created_at DESC);

-- 9) Add data validation constraints
ALTER TABLE public.restaurants 
  ADD CONSTRAINT restaurants_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  ADD CONSTRAINT restaurants_price_range_valid CHECK (price_range >= 1 AND price_range <= 4);

-- 10) Update existing data to use new defaults
UPDATE public.restaurants 
SET country = 'SE' 
WHERE country = 'US' OR country IS NULL;

-- 11) Generate slugs for restaurants that don't have them
UPDATE public.restaurants 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- 12) Ensure unique slugs by appending numbers if needed
DO $$
DECLARE
    r RECORD;
    counter INTEGER;
    new_slug TEXT;
BEGIN
    FOR r IN SELECT id, name, slug FROM public.restaurants WHERE slug IS NOT NULL LOOP
        counter := 1;
        new_slug := r.slug;
        
        WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE slug = new_slug AND id != r.id) LOOP
            new_slug := r.slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        IF new_slug != r.slug THEN
            UPDATE public.restaurants SET slug = new_slug WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- 13) Add helpful comments
COMMENT ON TYPE order_status_enum IS 'Valid order statuses for tracking order lifecycle';
COMMENT ON TYPE order_type_enum IS 'Valid order types for different service models';
COMMENT ON TYPE staff_role_enum IS 'Valid staff roles with hierarchical permissions';
COMMENT ON TYPE widget_event_type_enum IS 'Valid widget event types for analytics';
COMMENT ON TYPE chat_message_role_enum IS 'Valid chat message roles for conversation tracking';

COMMENT ON COLUMN public.restaurants.country IS 'ISO country code, defaults to SE (Sweden)';
COMMENT ON COLUMN public.restaurants.slug IS 'URL-friendly identifier, must be unique';
COMMENT ON COLUMN public.restaurants.allowed_origins IS 'Array of allowed domains for widget embedding';

-- 14) Create a function to generate unique slugs
CREATE OR REPLACE FUNCTION generate_unique_slug(base_name TEXT, table_name TEXT DEFAULT 'restaurants')
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    counter INTEGER := 1;
    final_slug TEXT;
BEGIN
    -- Generate base slug
    slug := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
    slug := REGEXP_REPLACE(slug, '^-+|-+$', '', 'g'); -- Remove leading/trailing dashes
    
    final_slug := slug;
    
    -- Ensure uniqueness
    WHILE EXISTS (
        EXECUTE format('SELECT 1 FROM public.%I WHERE slug = $1', table_name) 
        USING final_slug
    ) LOOP
        final_slug := slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Database architectural refinements completed successfully!' as status;
