-- Widget Data Spine Setup
-- Add missing tables for widget functionality

-- 1) Add allowed_origins column to restaurants (if not exists)
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS allowed_origins TEXT[] DEFAULT '{}';

-- 2) Widget Sessions Table
CREATE TABLE IF NOT EXISTS public.widget_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_token text not null,
  user_agent text,
  created_at timestamp with time zone default now(),
  unique(restaurant_id, session_token)
);

-- 3) Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
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

-- 4) Chat Response Cache Table
CREATE TABLE IF NOT EXISTS public.chat_response_cache (
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

-- 5) Menu Snapshots Table
CREATE TABLE IF NOT EXISTS public.menu_snapshots (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_hash text not null,
  sections jsonb not null,
  created_at timestamp with time zone default now()
);

-- 6) Widget Events Table
CREATE TABLE IF NOT EXISTS public.widget_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_token text,
  type text not null check (type in (
    'widget_open','chat','add_to_cart','checkout_start','order_created','order_failed'
  )),
  props jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- 7) Create Indexes
CREATE INDEX IF NOT EXISTS chat_messages_restaurant_created_idx
  on public.chat_messages(restaurant_id, created_at desc);

CREATE UNIQUE INDEX IF NOT EXISTS chat_response_cache_unique
  on public.chat_response_cache(restaurant_id, cache_key);

CREATE INDEX IF NOT EXISTS chat_response_cache_expires_idx
  on public.chat_response_cache(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS menu_snapshots_unique
  on public.menu_snapshots(restaurant_id, menu_hash);

CREATE INDEX IF NOT EXISTS widget_events_restaurant_created_idx
  on public.widget_events(restaurant_id, created_at desc);

-- 8) Enable RLS
ALTER TABLE public.widget_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;

-- 9) Service role policy for widget events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='widget_events' AND policyname='srv_write') THEN
    CREATE POLICY srv_write ON public.widget_events
      FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb ? 'role')
      WITH CHECK ( (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' );
  END IF;
END $$;

-- Success message
SELECT 'Widget data spine successfully created!' as status;
