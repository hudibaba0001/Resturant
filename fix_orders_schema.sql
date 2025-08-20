-- Drop the old orders table and recreate with correct schema
DROP TABLE IF EXISTS public.orders CASCADE;

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(restaurant_id, session_token)
);

-- Create orders table with correct schema
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('pickup', 'dine_in')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled', 'expired')),
    order_code VARCHAR(10) UNIQUE NOT NULL,
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'SEK',
    stripe_checkout_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL CHECK (qty > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chat_sessions_restaurant_token ON public.chat_sessions(restaurant_id, session_token);
CREATE INDEX idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX idx_orders_session_id ON public.orders(session_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_code ON public.orders(order_code);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_item_id ON public.order_items(item_id);

-- Create trigger for updated_at
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON public.chat_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Chat sessions policies
CREATE POLICY "Users can manage chat sessions for own restaurants" ON public.chat_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = chat_sessions.restaurant_id 
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

-- Order items policies
CREATE POLICY "Users can view order items for own restaurants" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.restaurants r ON r.id = o.restaurant_id
            WHERE o.id = order_items.order_id 
            AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'viewer'))
        )
    );

CREATE POLICY "Users can create order items for own restaurants" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.restaurants r ON r.id = o.restaurant_id
            WHERE o.id = order_items.order_id 
            AND (r.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), r.id, 'editor'))
        )
    );
