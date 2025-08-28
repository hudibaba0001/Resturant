-- 2025-01-28_order_status_rpc.sql
-- Optional RPC function for atomic order status updates with audit trail

BEGIN;

-- Create RPC function for atomic order status updates
-- This ensures both the status update and audit insert happen in one transaction
CREATE OR REPLACE FUNCTION public.advance_order_status(
  p_order_id uuid,
  p_to text,
  p_reason text default null
) returns table(id uuid, status text, restaurant_id uuid, updated_at timestamptz)
language plpgsql
security invoker
as $$
declare 
  v_from text;
  v_restaurant_id uuid;
begin
  -- lock row, RLS still applies
  select status, restaurant_id into v_from, v_restaurant_id 
  from public.orders 
  where id = p_order_id 
  for update;
  
  if not found then 
    raise exception 'not found'; 
  end if;

  -- validate transition
  if not (
    (v_from='pending'   and p_to in ('paid','cancelled','expired')) or
    (v_from='paid'      and p_to in ('preparing','cancelled'))      or
    (v_from='preparing' and p_to in ('ready','cancelled'))          or
    (v_from='ready'     and p_to in ('completed'))
  ) then
    raise exception 'invalid transition from % to %', v_from, p_to;
  end if;

  -- update order status atomically
  update public.orders
     set status = p_to,
         updated_at = now()
   where id = p_order_id and status = v_from
  returning id, status, restaurant_id, updated_at
    into id, status, restaurant_id, updated_at;

  if not found then
    raise exception 'conflict: status changed concurrently';
  end if;

  -- insert audit event in same transaction
  insert into public.order_status_events(
    order_id, 
    restaurant_id, 
    from_status, 
    to_status, 
    reason,
    changed_by
  )
  values (
    id, 
    restaurant_id, 
    v_from, 
    p_to, 
    left(p_reason, 500),
    auth.uid()
  );

  return next;
end $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.advance_order_status(uuid, text, text) TO authenticated;

COMMIT;
