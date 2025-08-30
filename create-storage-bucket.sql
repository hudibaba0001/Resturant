-- Create a public bucket for menu images
-- Run this in your Supabase SQL editor
select storage.create_bucket('menu-images', public := true);
