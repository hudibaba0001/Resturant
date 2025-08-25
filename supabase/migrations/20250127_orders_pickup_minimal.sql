-- Add pickup-related columns to orders table
-- This enables PIN-based handoff and customer contact info

alter table orders
  add column if not exists customer_name text,
  add column if not exists phone_e164 text,
  add column if not exists email text,
  add column if not exists pin text check (char_length(pin)=4),
  add column if not exists pin_issued_at timestamptz,
  add column if not exists pin_attempts int default 0,
  add column if not exists notification_status jsonb default '{}'::jsonb,
  add column if not exists picked_up_at timestamptz;

-- Indexes for efficient lookups
create index if not exists idx_orders_phone on orders(phone_e164);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_pin on orders(pin) where pin is not null;

-- RLS policies for new columns
alter table orders enable row level security;

-- Staff can view orders for their restaurant
create policy "Staff can view restaurant orders" on orders
  for select using (
    has_restaurant_permission(restaurant_id, 'staff')
  );

-- Staff can update pickup status
create policy "Staff can update pickup status" on orders
  for update using (
    has_restaurant_permission(restaurant_id, 'staff')
  ) with check (
    has_restaurant_permission(restaurant_id, 'staff')
  );

-- Function to validate PIN attempts (rate limiting)
create or replace function validate_pin_attempts(order_id uuid)
returns boolean as $$
declare
  max_attempts int := 5;
  attempt_window interval := interval '10 minutes';
  recent_attempts int;
begin
  select count(*) into recent_attempts
  from orders
  where id = order_id
    and pin_attempts >= max_attempts
    and pin_issued_at > now() - attempt_window;
    
  return recent_attempts = 0;
end;
$$ language plpgsql security definer;
