-- Verification script for RLS policies
-- Run this in your Supabase SQL editor to confirm policies are active

-- 1) Verify policies are active
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('orders','order_items','menu_items')
order by tablename, policyname;

-- 2) Confirm the order & staff line up (replace with your actual order ID and user ID)
-- This should return 1 row if the user has access to the order
with o as (
  select restaurant_id from public.orders where id = '97dea2ad-0ba6-427b-9baa-0ef80f2372d4'
)
select 1
from public.restaurant_staff s, o
where s.restaurant_id = o.restaurant_id
  and s.user_id = '40b0acf1-910e-4f3c-9c44-845a0298d8ab'
  and s.role in ('owner','manager','editor');

-- 3) Check if RLS is enabled on all tables
select 
  schemaname,
  tablename,
  rowsecurity
from pg_tables 
where schemaname = 'public' 
  and tablename in ('orders','order_items','menu_items')
order by tablename;

-- 4) List all restaurant staff for debugging
select 
  s.user_id,
  s.role,
  s.restaurant_id,
  o.id as order_id,
  o.status
from public.restaurant_staff s
left join public.orders o on o.restaurant_id = s.restaurant_id
where s.user_id = '40b0acf1-910e-4f3c-9c44-845a0298d8ab'
order by s.role, o.created_at desc;
