-- Fix section linking for menu items
-- This migration adds proper section_id foreign key to link items to sections

-- First, check if section_id column exists, if not add it
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS section_id UUID;

-- Add foreign key constraint to link items to sections
-- This will only work if the menu_sections_v2 table exists
DO $$ 
BEGIN
    -- Check if menu_sections_v2 table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_sections_v2') THEN
        -- Add foreign key constraint if it doesn't exist
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

-- Update existing items to link to sections based on section_path
-- This is a best-effort migration for existing data
-- First, let's check what columns exist in menu_sections_v2
-- We'll do a simpler approach that doesn't rely on specific column names
UPDATE public.menu_items 
SET section_id = (
    SELECT ms.id 
    FROM public.menu_sections_v2 ms 
    WHERE ms.name = menu_items.section_path[1] -- text[] array indexing
    LIMIT 1
)
WHERE section_id IS NULL 
AND section_path IS NOT NULL 
AND array_length(section_path, 1) > 0; -- text[] array length
