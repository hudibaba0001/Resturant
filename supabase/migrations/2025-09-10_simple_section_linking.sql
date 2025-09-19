-- Simple section linking migration
-- Just adds the section_id column and foreign key

-- Add section_id column to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS section_id UUID;

-- Add foreign key constraint (only if menu_sections_v2 exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_sections_v2') THEN
        -- Check if constraint already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'menu_items_section_id_fkey'
        ) THEN
            ALTER TABLE public.menu_items 
            ADD CONSTRAINT menu_items_section_id_fkey 
            FOREIGN KEY (section_id) REFERENCES public.menu_sections_v2(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Create index for section_id queries
CREATE INDEX IF NOT EXISTS idx_menu_items_section_id 
ON public.menu_items(section_id) 
WHERE section_id IS NOT NULL;
