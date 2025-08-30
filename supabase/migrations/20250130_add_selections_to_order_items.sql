do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'selections'
  ) then
    alter table public.order_items
      add column selections jsonb not null default '{}'::jsonb;
  end if;
end $$;
