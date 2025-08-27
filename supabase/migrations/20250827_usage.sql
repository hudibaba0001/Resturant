-- Usage tracking for restaurant quotas
create table if not exists public.usage_counters (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  period text not null, -- e.g. '2025-08'
  messages_used int not null default 0,
  tokens_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (restaurant_id, period)
);

-- Enable RLS
alter table public.usage_counters enable row level security;

-- Service role only (usage tracking is internal)
create policy "usage_service_only" on public.usage_counters
  using (false) with check (false);

-- Add updated_at trigger
create or replace function public.touch_usage_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_usage_touch before update on public.usage_counters
  for each row execute function public.touch_usage_updated_at();
