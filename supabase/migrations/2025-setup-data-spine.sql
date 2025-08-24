-- restaurants: allowlist of origins
alter table if exists public.restaurants
  add column if not exists allowed_origins text[] default '{}';

-- widget sessions
create table if not exists public.widget_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_token text not null,
  user_agent text,
  created_at timestamp with time zone default now(),
  unique(restaurant_id, session_token)
);

-- chat messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  widget_session_id uuid references public.widget_sessions(id) on delete set null,
  role text not null check (role in ('user','assistant','tool')),
  locale text,
  content text not null,
  tokens int,
  meta jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);
create index if not exists chat_messages_restaurant_created_idx
  on public.chat_messages(restaurant_id, created_at desc);

-- chat response cache
create table if not exists public.chat_response_cache (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  cache_key text not null,
  reply jsonb not null,
  cards jsonb not null default '[]'::jsonb,
  menu_hash text not null,
  locale text,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null
);
create unique index if not exists chat_response_cache_unique
  on public.chat_response_cache(restaurant_id, cache_key);
create index if not exists chat_response_cache_expires_idx
  on public.chat_response_cache(expires_at);

-- menu snapshots (hash -> content)
create table if not exists public.menu_snapshots (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_hash text not null,
  sections jsonb not null,
  created_at timestamp with time zone default now()
);
create unique index if not exists menu_snapshots_unique
  on public.menu_snapshots(restaurant_id, menu_hash);

-- widget events (analytics)
create table if not exists public.widget_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_token text,
  type text not null check (type in (
    'widget_open','chat','add_to_cart','checkout_start','order_created','order_failed'
  )),
  props jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);
create index if not exists widget_events_restaurant_created_idx
  on public.widget_events(restaurant_id, created_at desc);

-- RLS: enable, but allow only service role to write
alter table public.widget_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_response_cache enable row level security;
alter table public.menu_snapshots enable row level security;
alter table public.widget_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='widget_events' and policyname='srv_write') then
    create policy srv_write on public.widget_events
      for all using (current_setting('request.jwt.claims', true)::jsonb ? 'role')
      with check ( (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' );
  end if;
end $$;
