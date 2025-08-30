-- Create a public bucket for menu images
-- Run this in your Supabase SQL editor

-- Method 1: Try the standard storage.create_bucket function
-- If this fails, use Method 2 below
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Method 2: Alternative approach if the above doesn't work
-- You can also create the bucket through the Supabase Dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Click "Create a new bucket"
-- 3. Name it "menu-images"
-- 4. Make it public
-- 5. Click "Create bucket"
