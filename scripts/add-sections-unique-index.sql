-- Add unique index to prevent duplicate section names per menu
-- This provides DB-level safety in addition to app-level checks

create unique index if not exists uq_sections_menu_name
on public.menu_sections_v2 (menu_id, lower(name));

-- Add comment for documentation
comment on index uq_sections_menu_name is 'Prevents duplicate section names within the same menu';
