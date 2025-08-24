-- Database Fixes Patch
-- Clean, idempotent version of restaurant tables with all issues resolved

-- 0) Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Core helpers (define functions first)
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

-- 2) Tables (IF NOT EXISTS so re-runs are safe)
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
  country VARCHAR(100) DEFAULT 'US',
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  website VARCHAR(255),
  cuisine_type VARCHAR(100),
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
  )
);

CREATE TABLE IF NOT EXISTS public.restaurant_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner','manager','editor','viewer')),
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

-- 3) Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON public.restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_type ON public.restaurants(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON public.restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON public.restaurants(created_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm ON public.restaurants USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON public.restaurants(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_search_vector ON public.restaurants USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_restaurant_cuisines_restaurant_id ON public.restaurant_cuisines(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_cuisines_cuisine_id ON public.restaurant_cuisines(cuisine_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_restaurant_id ON public.restaurant_staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_user_id ON public.restaurant_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_role ON public.restaurant_staff(role);

-- 4) Triggers (drop then create to stay idempotent)
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

-- 5) RLS (after tables exist)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;

-- 6) Policies (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Users can view own restaurants'
  ) THEN
    CREATE POLICY "Users can view own restaurants" ON public.restaurants
      FOR SELECT USING (auth.uid() = owner_id OR has_restaurant_permission(auth.uid(), id, 'viewer'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Users can insert own restaurants'
  ) THEN
    CREATE POLICY "Users can insert own restaurants" ON public.restaurants
      FOR INSERT WITH CHECK (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Users can update restaurants with permission'
  ) THEN
    CREATE POLICY "Users can update restaurants with permission" ON public.restaurants
      FOR UPDATE USING (auth.uid() = owner_id OR has_restaurant_permission(auth.uid(), id, 'editor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Users can delete own restaurants'
  ) THEN
    CREATE POLICY "Users can delete own restaurants" ON public.restaurants
      FOR DELETE USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurants' AND policyname='Public can view active and verified restaurants'
  ) THEN
    CREATE POLICY "Public can view active and verified restaurants" ON public.restaurants
      FOR SELECT USING (is_active = true AND is_verified = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cuisines' AND policyname='Public can view cuisines'
  ) THEN
    CREATE POLICY "Public can view cuisines" ON public.cuisines
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_cuisines' AND policyname='Users can view restaurant cuisines for own restaurants'
  ) THEN
    CREATE POLICY "Users can view restaurant cuisines for own restaurants" ON public.restaurant_cuisines
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_cuisines.restaurant_id
                  AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'viewer')))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_cuisines' AND policyname='Public can view restaurant cuisines for active restaurants'
  ) THEN
    CREATE POLICY "Public can view restaurant cuisines for active restaurants" ON public.restaurant_cuisines
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_cuisines.restaurant_id
                  AND r.is_active = true AND r.is_verified = true)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_cuisines' AND policyname='Users can manage cuisines for own restaurants'
  ) THEN
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_staff' AND policyname='Users can view staff for own restaurants'
  ) THEN
    CREATE POLICY "Users can view staff for own restaurants" ON public.restaurant_staff
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.restaurants r
                WHERE r.id = restaurant_staff.restaurant_id
                  AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'manager')))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_staff' AND policyname='Owners can manage staff'
  ) THEN
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
END $$;

-- 7) Sample data (optional - for testing)
INSERT INTO public.cuisines (name, description) VALUES
  ('Italian', 'Traditional Italian cuisine with pasta, pizza, and Mediterranean flavors'),
  ('Mexican', 'Authentic Mexican dishes with bold spices and fresh ingredients'),
  ('Asian Fusion', 'Modern fusion of various Asian cuisines'),
  ('American', 'Classic American comfort food and regional specialties'),
  ('Mediterranean', 'Healthy Mediterranean diet with olive oil, seafood, and fresh vegetables')
ON CONFLICT (name) DO NOTHING;

-- Success message
SELECT 'Database schema successfully created/updated!' as status;
