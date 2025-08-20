-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create cuisines table for flexible cuisine categorization
CREATE TABLE public.cuisines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurants table with foreign key constraint to users table
CREATE TABLE public.restaurants (
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
    cuisine_type VARCHAR(100), -- Keep for backward compatibility, will be deprecated
    price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4), -- 1=$, 2=$$, 3=$$$, 4=$$$$
    capacity SMALLINT,
    opening_hours JSONB, -- Store hours as JSON: {"monday": {"open": "09:00", "close": "22:00"}, ...}
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    search_vector tsvector, -- Full-text search vector
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT restaurants_name_not_empty CHECK (name != ''),
    CONSTRAINT restaurants_email_valid CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT restaurants_phone_valid CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT restaurants_coordinates_valid CHECK (
        (latitude IS NULL AND longitude IS NULL) OR 
        (latitude IS NOT NULL AND longitude IS NOT NULL AND 
         latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
);

-- Create restaurant_staff table for role-based access control
CREATE TABLE public.restaurant_staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'editor', 'viewer')),
    permissions JSONB DEFAULT '{}', -- Flexible permissions storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique user-restaurant combinations
    UNIQUE(restaurant_id, user_id)
);

-- Create restaurant_cuisines junction table for many-to-many relationship
CREATE TABLE public.restaurant_cuisines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    cuisine_id UUID NOT NULL REFERENCES public.cuisines(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique restaurant-cuisine combinations
    UNIQUE(restaurant_id, cuisine_id)
);

-- Create indexes for better performance
CREATE INDEX idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX idx_restaurants_city ON public.restaurants(city);
CREATE INDEX idx_restaurants_cuisine_type ON public.restaurants(cuisine_type);
CREATE INDEX idx_restaurants_is_active ON public.restaurants(is_active);
CREATE INDEX idx_restaurants_created_at ON public.restaurants(created_at);

-- Create GIN index with gin_trgm_ops on name column for fast trigram text searching
CREATE INDEX idx_restaurants_name_trgm ON public.restaurants USING GIN (name gin_trgm_ops);

-- Create spatial index for location-based queries (using B-tree for lat/lon columns)
CREATE INDEX idx_restaurants_location ON public.restaurants(latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create GIN index for full-text search vector
CREATE INDEX idx_restaurants_search_vector ON public.restaurants USING GIN (search_vector);

-- Create indexes for restaurant_cuisines junction table
CREATE INDEX idx_restaurant_cuisines_restaurant_id ON public.restaurant_cuisines(restaurant_id);
CREATE INDEX idx_restaurant_cuisines_cuisine_id ON public.restaurant_cuisines(cuisine_id);

-- Create indexes for restaurant_staff table
CREATE INDEX idx_restaurant_staff_restaurant_id ON public.restaurant_staff(restaurant_id);
CREATE INDEX idx_restaurant_staff_user_id ON public.restaurant_staff(user_id);
CREATE INDEX idx_restaurant_staff_role ON public.restaurant_staff(role);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the search vector
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
$$ language 'plpgsql';

-- Helper function to check if user has permission on restaurant
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
    -- Check if user is the owner
    IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_uuid AND owner_id = user_uuid) THEN
        RETURN true;
    END IF;
    
    -- Check staff permissions
    SELECT role INTO user_role 
    FROM public.restaurant_staff 
    WHERE restaurant_id = restaurant_uuid AND user_id = user_uuid;
    
    IF user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check role hierarchy
    RETURN (role_hierarchy->>user_role)::INTEGER >= (role_hierarchy->>required_role)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_restaurants_updated_at 
    BEFORE UPDATE ON public.restaurants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_search_vector 
    BEFORE INSERT OR UPDATE ON public.restaurants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_restaurant_search_vector();

-- Add RLS (Row Level Security) policies for Supabase
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;

-- Restaurant policies (updated to use RBAC)
CREATE POLICY "Users can view own restaurants" ON public.restaurants
    FOR SELECT USING (
        auth.uid() = owner_id OR 
        has_restaurant_permission(auth.uid(), id, 'viewer')
    );

CREATE POLICY "Users can insert own restaurants" ON public.restaurants
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update restaurants with permission" ON public.restaurants
    FOR UPDATE USING (
        auth.uid() = owner_id OR 
        has_restaurant_permission(auth.uid(), id, 'editor')
    );

CREATE POLICY "Users can delete own restaurants" ON public.restaurants
    FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Public can view active and verified restaurants" ON public.restaurants
    FOR SELECT USING (is_active = true AND is_verified = true);

-- Cuisine policies (public read access, admin write access)
CREATE POLICY "Public can view cuisines" ON public.cuisines
    FOR SELECT USING (true);

-- Restaurant cuisines policies
CREATE POLICY "Users can view restaurant cuisines for own restaurants" ON public.restaurant_cuisines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = restaurant_cuisines.restaurant_id 
            AND (restaurants.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), restaurants.id, 'viewer'))
        )
    );

CREATE POLICY "Public can view restaurant cuisines for active restaurants" ON public.restaurant_cuisines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = restaurant_cuisines.restaurant_id 
            AND restaurants.is_active = true 
            AND restaurants.is_verified = true
        )
    );

CREATE POLICY "Users can manage cuisines for own restaurants" ON public.restaurant_cuisines
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = restaurant_cuisines.restaurant_id 
            AND (restaurants.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), restaurants.id, 'editor'))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = restaurant_cuisines.restaurant_id 
            AND (restaurants.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), restaurants.id, 'editor'))
        )
    );

-- Restaurant staff policies
CREATE POLICY "Users can view staff for own restaurants" ON public.restaurant_staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = restaurant_staff.restaurant_id 
            AND (restaurants.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), restaurants.id, 'manager'))
        )
    );

CREATE POLICY "Owners can manage staff" ON public.restaurant_staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = restaurant_staff.restaurant_id 
            AND restaurants.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = restaurant_staff.restaurant_id 
            AND restaurants.owner_id = auth.uid()
        )
    );

-- Add updated_at triggers to all timestamped tables
CREATE TRIGGER tg_cuisines_updated
    BEFORE UPDATE ON public.cuisines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tg_restaurant_staff_updated
    BEFORE UPDATE ON public.restaurant_staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tg_restaurant_cuisines_updated
    BEFORE UPDATE ON public.restaurant_cuisines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
