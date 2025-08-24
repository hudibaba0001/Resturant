-- Master Database Schema for Restaurant Management System
-- Complete, production-ready schema with architectural refinements
-- Generated: 2025-08-24

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 2. ENUM TYPES (Data Integrity)
-- ============================================================================
CREATE TYPE order_status_enum AS ENUM ('pending', 'paid', 'cancelled', 'fulfilled', 'refunded');
CREATE TYPE order_type_enum AS ENUM ('pickup', 'delivery', 'dine_in');
CREATE TYPE staff_role_enum AS ENUM ('owner', 'manager', 'editor', 'viewer');
CREATE TYPE widget_event_type_enum AS ENUM ('widget_open', 'chat', 'add_to_cart', 'checkout_start', 'order_created', 'order_failed');
CREATE TYPE chat_message_role_enum AS ENUM ('user', 'assistant', 'tool');

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_restaurant_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION has_restaurant_permission(
  user_uuid UUID,
  restaurant_uuid UUID,
  required_role VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(50);
  role_hierarchy JSONB := '{"owner": 4, "manager": 3, "editor": 2, "viewer": 1}'::JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_uuid AND owner_id = user_uuid) THEN
    RETURN true;
  END IF;

  SELECT role INTO user_role
  FROM public.restaurant_staff
  WHERE restaurant_id = restaurant_uuid AND user_id = user_uuid;

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  RETURN (role_hierarchy->>user_role)::INTEGER >= (role_hierarchy->>required_role)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION generate_unique_slug(base_name TEXT, table_name TEXT DEFAULT 'restaurants')
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    counter INTEGER := 1;
    final_slug TEXT;
    query TEXT;
    result BOOLEAN;
BEGIN
    -- Generate base slug
    slug := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
    slug := REGEXP_REPLACE(slug, '^-+|-+$', '', 'g'); -- Remove leading/trailing dashes
    
    final_slug := slug;
    
    -- Ensure uniqueness
    LOOP
        query := format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE slug = %L)', table_name, final_slug);
        EXECUTE query INTO result;
        
        IF NOT result THEN
            EXIT;
        END IF;
        
        final_slug := slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CORE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cuisines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'SE',
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  website VARCHAR(255),
  price_range INTEGER CHECK (price_range BETWEEN 1 AND 4),
  capacity SMALLINT,
  opening_hours JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  search_vector tsvector,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allowed_origins TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT restaurants_name_not_empty CHECK (name <> ''),
  CONSTRAINT restaurants_email_valid CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT restaurants_phone_valid CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT restaurants_coordinates_valid CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  ),
  CONSTRAINT restaurants_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT restaurants_price_range_valid CHECK (price_range >= 1 AND price_range <= 4)
);

CREATE TABLE IF NOT EXISTS public.restaurant_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role staff_role_enum NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.restaurant_cuisines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  cuisine_id UUID NOT NULL REFERENCES public.cuisines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, cuisine_id)
);

-- ============================================================================
-- 5. WIDGET DATA SPINE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.widget_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_token text not null,
  user_agent text,
  created_at timestamp with time zone default now(),
  unique(restaurant_id, session_token)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  widget_session_id uuid references public.widget_sessions(id) on delete set null,
  role chat_message_role_enum not null,
  locale text,
  content text not null,
  tokens int,
  meta jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.chat_response_cache (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  cache_key text not null,
  reply jsonb not null,
  cards jsonb not null default '[]'::jsonb,
  menu_hash text not null,
  locale text,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null
);

CREATE TABLE IF NOT EXISTS public.menu_snapshots (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_hash text not null,
  sections jsonb not null,
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.widget_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_token text,
  type widget_event_type_enum not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- ============================================================================
-- 6. INDEXES (Performance)
-- ============================================================================
-- Restaurant indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON public.restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON public.restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON public.restaurants(created_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_country ON public.restaurants(country);
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm ON public.restaurants USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON public.restaurants(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_search_vector ON public.restaurants USING GIN (search_vector);

-- Staff indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_restaurant_id ON public.restaurant_staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_user_id ON public.restaurant_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_role ON public.restaurant_staff(role);

-- Cuisine indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_cuisines_restaurant_id ON public.restaurant_cuisines(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_cuisines_cuisine_id ON public.restaurant_cuisines(cuisine_id);

-- Widget data spine indexes
CREATE INDEX IF NOT EXISTS chat_messages_restaurant_created_idx ON public.chat_messages(restaurant_id, created_at desc);
CREATE UNIQUE INDEX IF NOT EXISTS chat_response_cache_unique ON public.chat_response_cache(restaurant_id, cache_key);
CREATE INDEX IF NOT EXISTS chat_response_cache_expires_idx ON public.chat_response_cache(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS menu_snapshots_unique ON public.menu_snapshots(restaurant_id, menu_hash);
CREATE INDEX IF NOT EXISTS widget_events_restaurant_created_idx ON public.widget_events(restaurant_id, created_at desc);

-- ============================================================================
-- 7. TRIGGERS (Automation)
-- ============================================================================
DROP TRIGGER IF EXISTS tg_cuisines_updated ON public.cuisines;
CREATE TRIGGER tg_cuisines_updated
  BEFORE UPDATE ON public.cuisines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tg_restaurant_staff_updated ON public.restaurant_staff;
CREATE TRIGGER tg_restaurant_staff_updated
  BEFORE UPDATE ON public.restaurant_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tg_restaurant_cuisines_updated ON public.restaurant_cuisines;
CREATE TRIGGER tg_restaurant_cuisines_updated
  BEFORE UPDATE ON public.restaurant_cuisines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurants_search_vector ON public.restaurants;
CREATE TRIGGER update_restaurants_search_vector
  BEFORE INSERT OR UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION update_restaurant_search_vector();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (Security)
-- ============================================================================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. RLS POLICIES (Access Control)
-- ============================================================================
DO $$
BEGIN
  -- Restaurant policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Users can view own restaurants') THEN
    CREATE POLICY "Users can view own restaurants" ON public.restaurants
      FOR SELECT USING (auth.uid() = owner_id OR has_restaurant_permission(auth.uid(), id, 'viewer'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Users can insert own restaurants') THEN
    CREATE POLICY "Users can insert own restaurants" ON public.restaurants
      FOR INSERT WITH CHECK (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Users can update restaurants with permission') THEN
    CREATE POLICY "Users can update restaurants with permission" ON public.restaurants
      FOR UPDATE USING (auth.uid() = owner_id OR has_restaurant_permission(auth.uid(), id, 'editor'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Users can delete own restaurants') THEN
    CREATE POLICY "Users can delete own restaurants" ON public.restaurants
      FOR DELETE USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Public can view active and verified restaurants') THEN
    CREATE POLICY "Public can view active and verified restaurants" ON public.restaurants
      FOR SELECT USING (is_active = true AND is_verified = true);
  END IF;

  -- Cuisine policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuisines' AND policyname='Public can view cuisines') THEN
    CREATE POLICY "Public can view cuisines" ON public.cuisines
      FOR SELECT USING (true);
  END IF;

  -- Restaurant cuisines policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_cuisines' AND policyname='Users can view restaurant cuisines for own restaurants') THEN
    CREATE POLICY "Users can view restaurant cuisines for own restaurants" ON public.restaurant_cuisines
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_cuisines.restaurant_id
                  AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'viewer')))
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_cuisines' AND policyname='Public can view restaurant cuisines for active restaurants') THEN
    CREATE POLICY "Public can view restaurant cuisines for active restaurants" ON public.restaurant_cuisines
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_cuisines.restaurant_id
                  AND r.is_active = true AND r.is_verified = true)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_cuisines' AND policyname='Users can manage cuisines for own restaurants') THEN
    CREATE POLICY "Users can manage cuisines for own restaurants" ON public.restaurant_cuisines
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_cuisines.restaurant_id
                  AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'editor')))
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_cuisines.restaurant_id
                  AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'editor')))
      );
  END IF;

  -- Staff policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_staff' AND policyname='Users can view staff for own restaurants') THEN
    CREATE POLICY "Users can view staff for own restaurants" ON public.restaurant_staff
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_staff.restaurant_id
                  AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'manager')))
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_staff' AND policyname='Owners can manage staff') THEN
    CREATE POLICY "Owners can manage staff" ON public.restaurant_staff
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_staff.restaurant_id
                  AND r.owner_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_staff.restaurant_id
                  AND r.owner_id = auth.uid())
      );
  END IF;

  -- Widget events service role policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='widget_events' AND policyname='srv_write') THEN
    CREATE POLICY srv_write ON public.widget_events
      FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb ? 'role')
      WITH CHECK ( (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' );
  END IF;
END $$;

-- ============================================================================
-- 10. SAMPLE DATA (Optional)
-- ============================================================================
INSERT INTO public.cuisines (name, description) VALUES
  ('Italian', 'Traditional Italian cuisine with pasta, pizza, and Mediterranean flavors'),
  ('Mexican', 'Authentic Mexican dishes with bold spices and fresh ingredients'),
  ('Asian Fusion', 'Modern fusion of various Asian cuisines'),
  ('American', 'Classic American comfort food and regional specialties'),
  ('Mediterranean', 'Healthy Mediterranean diet with olive oil, seafood, and fresh vegetables')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 11. COMMENTS (Documentation)
-- ============================================================================
COMMENT ON TYPE order_status_enum IS 'Valid order statuses for tracking order lifecycle';
COMMENT ON TYPE order_type_enum IS 'Valid order types for different service models';
COMMENT ON TYPE staff_role_enum IS 'Valid staff roles with hierarchical permissions';
COMMENT ON TYPE widget_event_type_enum IS 'Valid widget event types for analytics';
COMMENT ON TYPE chat_message_role_enum IS 'Valid chat message roles for conversation tracking';

COMMENT ON COLUMN public.restaurants.country IS 'ISO country code, defaults to SE (Sweden)';
COMMENT ON COLUMN public.restaurants.slug IS 'URL-friendly identifier, must be unique';
COMMENT ON COLUMN public.restaurants.allowed_origins IS 'Array of allowed domains for widget embedding';

-- ============================================================================
-- 12. SUCCESS MESSAGE
-- ============================================================================
SELECT 'Master database schema successfully created with all architectural refinements!' as status;
