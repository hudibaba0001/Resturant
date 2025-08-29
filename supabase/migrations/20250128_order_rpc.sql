-- exact signature in PUBLIC schema
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
  select o.restaurant_id into r_restaurant from public.orders o where o.id = p_order_id;
  if r_restaurant is null then raise exception 'not found' using errcode = 'P0002'; end if;

  if not exists (
    select 1 from public.restaurant_staff s
    where s.restaurant_id = r_restaurant
      and s.user_id = auth.uid()
      and s.role in ('owner','manager','editor')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select
      o.id, o.code, o.status, o.total_cents, o.currency, o.created_at,
      oi.id, oi.qty, oi.price_cents, oi.notes,
      mi.id, mi.name, mi.currency
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    left join public.menu_items mi on mi.id = oi.item_id
    where o.id = p_order_id;
end;
$$;

revoke all on function public.get_order_with_items(uuid) from public, anon;
grant execute on function public.get_order_with_items(uuid) to authenticated;
