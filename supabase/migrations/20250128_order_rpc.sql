-- Ensure function exists at exactly this signature in the PUBLIC schema
drop function if exists public.get_order_with_items(uuid);

create or replace function public.get_order_with_items(p_order_id uuid)
returns table (
  order_id uuid,
  code text,
  status text,
  total_cents integer,
  currency text,
  created_at timestamptz,
  order_item_id uuid,
  qty integer,
  price_cents integer,
  notes text,
  menu_item_id uuid,
  menu_item_name text,
  menu_item_currency text
)
language plpgsql
security definer
set search_path = public
as $$
declare r_restaurant uuid;
begin
  -- Find the order restaurant
  select o.restaurant_id into r_restaurant
  from public.orders o
  where o.id = p_order_id;

  if r_restaurant is null then
    -- use a standard SQLSTATE code
    raise exception 'not found' using errcode = 'P0002'; -- no_data_found
  end if;

  -- Staff (editor+) of that restaurant only
  if not exists (
    select 1
    from public.restaurant_staff s
    where s.restaurant_id = r_restaurant
      and s.user_id = auth.uid()
      and s.role in ('owner','manager','editor')
  ) then
    raise exception 'forbidden' using errcode = '42501'; -- insufficient_privilege
  end if;

  return query
    select
      o.id as order_id,
      o.code,
      o.status,
      o.total_cents,
      o.currency,
      o.created_at,
      oi.id as order_item_id,
      oi.qty,
      oi.price_cents,
      oi.notes,
      mi.id as menu_item_id,
      mi.name as menu_item_name,
      mi.currency as menu_item_currency
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    left join public.menu_items mi on mi.id = oi.item_id
    where o.id = p_order_id;
end;
$$;

-- Grants: API routes use authenticated sessions, so anon is not required.
revoke all on function public.get_order_with_items(uuid) from public, anon;
grant execute on function public.get_order_with_items(uuid) to authenticated;
