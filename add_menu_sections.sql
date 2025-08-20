-- Add missing menu_sections table
CREATE TABLE IF NOT EXISTS public.menu_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT menu_sections_name_not_empty CHECK (name != '')
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_menu_sections_restaurant_id ON public.menu_sections(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_sections_position ON public.menu_sections(position);

-- Add trigger for updated_at
CREATE TRIGGER update_menu_sections_updated_at 
    BEFORE UPDATE ON public.menu_sections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;

-- Menu sections policies
CREATE POLICY "Public can view menu sections for active restaurants" ON public.menu_sections
    FOR SELECT USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = menu_sections.restaurant_id 
            AND restaurants.is_active = true 
            AND restaurants.is_verified = true
        )
    );

CREATE POLICY "Users can manage menu sections for own restaurants" ON public.menu_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = menu_sections.restaurant_id 
            AND (restaurants.owner_id = auth.uid() OR has_restaurant_permission(auth.uid(), restaurants.id, 'editor'))
        )
    );
