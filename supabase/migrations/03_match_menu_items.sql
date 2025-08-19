-- Create menu_items table
CREATE TABLE public.menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category VARCHAR(100),
    is_available BOOLEAN DEFAULT true,
    image_url VARCHAR(500),
    allergens JSONB DEFAULT '[]',
    nutritional_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT menu_items_name_not_empty CHECK (name != '')
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('pickup', 'delivery')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled', 'expired')),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    items JSONB NOT NULL DEFAULT '[]',
    customer_info JSONB DEFAULT '{}',
    delivery_address TEXT,
    stripe_session_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON public.menu_items(category);
CREATE INDEX idx_menu_items_is_available ON public.menu_items(is_available);
CREATE INDEX idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX idx_orders_session_token ON public.orders(session_token);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_menu_items_updated_at 
    BEFORE UPDATE ON public.menu_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Menu items policies
CREATE POLICY "Public can view available menu items for active restaurants" ON public.menu_items
    FOR SELECT USING (
        is_available = true AND
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = menu_items.restaurant_id 
            AND restaurants.is_active = true 
            AND restaurants.is_verified = true
        )
    );

CREATE POLICY "Users can manage menu items for own restaurants" ON public.menu_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = menu_items.restaurant_id 
            AND (restaurants.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), restaurants.id, 'editor'))
        )
    );

-- Orders policies
CREATE POLICY "Users can view orders for own restaurants" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = orders.restaurant_id 
            AND (restaurants.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), restaurants.id, 'viewer'))
        )
    );

CREATE POLICY "Users can create orders for own restaurants" ON public.orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = orders.restaurant_id 
            AND (restaurants.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), restaurants.id, 'editor'))
        )
    );

CREATE POLICY "Users can update orders for own restaurants" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = orders.restaurant_id 
            AND (restaurants.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), restaurants.id, 'editor'))
        )
    );

-- RPC function to search menu items with full-text search
CREATE OR REPLACE FUNCTION search_menu_items(
    restaurant_uuid UUID,
    search_query TEXT DEFAULT '',
    category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    price DECIMAL(10,2),
    category TEXT,
    image_url TEXT,
    rank FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.category,
        mi.image_url,
        CASE 
            WHEN search_query = '' THEN 1.0
            ELSE ts_rank(
                to_tsvector('english', COALESCE(mi.name, '') || ' ' || COALESCE(mi.description, '')),
                to_tsquery('english', search_query)
            )
        END as rank
    FROM public.menu_items mi
    WHERE mi.restaurant_id = restaurant_uuid
        AND mi.is_available = true
        AND (category_filter IS NULL OR mi.category = category_filter)
        AND (search_query = '' OR 
             to_tsvector('english', COALESCE(mi.name, '') || ' ' || COALESCE(mi.description, '')) @@ 
             to_tsquery('english', search_query))
    ORDER BY rank DESC NULLS LAST, mi.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get restaurant menu with categories
CREATE OR REPLACE FUNCTION get_restaurant_menu(restaurant_uuid UUID)
RETURNS TABLE (
    category TEXT,
    items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.category,
        jsonb_agg(
            jsonb_build_object(
                'id', mi.id,
                'name', mi.name,
                'description', mi.description,
                'price', mi.price,
                'image_url', mi.image_url,
                'allergens', mi.allergens,
                'nutritional_info', mi.nutritional_info
            ) ORDER BY mi.name
        ) as items
    FROM public.menu_items mi
    WHERE mi.restaurant_id = restaurant_uuid
        AND mi.is_available = true
    GROUP BY mi.category
    ORDER BY mi.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
