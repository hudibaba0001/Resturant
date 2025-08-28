-- Function returns one row per line-item (LEFT JOIN so orders w/ zero lines still return one row with nulls)
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
  -- 1) Resolve restaurant for the order
  select o.restaurant_id into r_restaurant
  from public.orders o
  where o.id = p_order_id;

  if r_restaurant is null then
    raise exception 'not found' using errcode = 'NO_DATA_FOUND';
  end if;

  -- 2) Authorize: staff editor+ of same restaurant
  if not exists (
    select 1
    from public.restaurant_staff s
    where s.restaurant_id = r_restaurant
      and s.user_id = auth.uid()
      and s.role in ('owner','manager','editor')
  ) then
    raise exception 'forbidden' using errcode = 'INSUFFICIENT_PRIVILEGE';
  end if;

  -- 3) Return order + items (LEFT JOIN so we still return an empty line set cleanly)
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

-- lock down and allow normal roles to execute
revoke all on function public.get_order_with_items(uuid) from public;
grant execute on function public.get_order_with_items(uuid) to anon, authenticated;
