-- Add missing slug column to existing restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- Add index for the slug column
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
