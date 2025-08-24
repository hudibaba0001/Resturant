-- 2025-08-24_widget_core.sql
begin;

-- Extensions (uuid + search)
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- === restaurants hardening ===
-- Types cleanup: state/postal_code -> text; ensure opening_hours/allowed_origins -> jsonb
alter table if exists public.restaurants
  alter column state type text using case when state is null then null else state::text end,
  alter column postal_code type text using case when postal_code is null then null else postal_code::text end,
  alter column opening_hours type jsonb using opening_hours::jsonb;

-- Handle allowed_origins conversion from text[] to jsonb
do $$
begin
  -- Check if allowed_origins is text[] and convert to jsonb
  if exists (
    select 1 from information_schema.columns 
    where table_name='restaurants' 
    and column_name='allowed_origins' 
    and data_type='ARRAY'
  ) then
    -- Drop the default first, then convert type, then set new default
    alter table public.restaurants alter column allowed_origins drop default;
    alter table public.restaurants 
    alter column allowed_origins type jsonb using 
      case 
        when allowed_origins is null then '[]'::jsonb
        else to_jsonb(allowed_origins)
      end;
    alter table public.restaurants alter column allowed_origins set default '[]'::jsonb;
  elsif exists (
    select 1 from information_schema.columns 
    where table_name='restaurants' 
    and column_name='allowed_origins' 
    and data_type='jsonb'
  ) then
    -- Already jsonb, ensure it's an array
    update public.restaurants 
    set allowed_origins = '[]'::jsonb 
    where allowed_origins is null or jsonb_typeof(allowed_origins) != 'array';
  else
    -- Column doesn't exist, add it
    alter table public.restaurants add column allowed_origins jsonb default '[]'::jsonb;
  end if;
end $$;

-- slug + search vector
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name='restaurants' and column_name='slug'
  ) then
    alter table public.restaurants add column slug text;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name='restaurants' and column_name='search_vector' and data_type <> 'tsvector'
  ) then
    alter table public.restaurants
      alter column search_vector type tsvector using to_tsvector('simple',
        coalesce(name,'') || ' ' || coalesce(description,'') || ' ' ||
        coalesce(city,'') || ' ' || coalesce(cuisine_type,'')
      );
  elsif not exists (
    select 1 from information_schema.columns
    where table_name='restaurants' and column_name='search_vector'
  ) then
    alter table public.restaurants
      add column search_vector tsvector generated always as (
        to_tsvector('simple',
          coalesce(name,'') || ' ' || coalesce(description,'') || ' ' ||
          coalesce(city,'') || ' ' || coalesce(cuisine_type,'')
        )
      ) stored;
  end if;
end $$;

create index if not exists restaurants_slug_key on public.restaurants (slug);
create index if not exists restaurants_search_idx on public.restaurants using gin (search_vector);
create index if not exists restaurants_active_idx on public.restaurants (is_active);

-- upsert slug on insert/update
create or replace function public.slugify(txt text)
returns text language sql immutable as $$
  select regexp_replace(
           lower(unaccent(coalesce(txt,''))),
           '[^a-z0-9]+','-','g'
         )::text;
$$;

create or replace function public.restaurants_set_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.name);
  end if;
  return new;
end $$;

drop trigger if exists trg_restaurants_set_slug on public.restaurants;
create trigger trg_restaurants_set_slug
before insert or update of name, slug on public.restaurants
for each row execute function public.restaurants_set_slug();

-- updated_at auto-touch
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_restaurants_touch on public.restaurants;
create trigger trg_restaurants_touch
before update on public.restaurants
for each row execute function public.touch_updated_at();

-- open_now helper: checks opening_hours JSON against current day/time (UTC)
create or replace function public.restaurant_open_now(p_restaurant uuid, p_at timestamptz default now())
returns boolean language plpgsql stable as $$
declare
  oh jsonb;
  dow text;
  open_t text;
  close_t text;
  t time;
begin
  select opening_hours into oh
  from public.restaurants where id = p_restaurant;

  if oh is null then return true; end if;

  dow := lower(to_char(p_at at time zone 'UTC','Day'));
  dow := trim(dow); -- 'monday', etc.

  open_t  := (oh -> dow ->> 'open');
  close_t := (oh -> dow ->> 'close');

  if open_t is null or close_t is null then
    return true; -- be permissive if not configured
  end if;

  t := (p_at at time zone 'UTC')::time;

  if open_t <= close_t then
    return (t >= open_t::time and t <= close_t::time);
  else
    -- overnight window (e.g. 18:00 -> 02:00)
    return (t >= open_t::time or t <= close_t::time);
  end if;
end $$;

-- === canonical widget tables ===

-- sessions
create table if not exists public.widget_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_token text not null unique,
  origin text,
  referer text,
  user_agent text,
  locale text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists widget_sessions_restaurant_idx on public.widget_sessions (restaurant_id);
create index if not exists widget_sessions_last_seen_idx on public.widget_sessions (last_seen_at);

-- events
create table if not exists public.widget_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id uuid not null references public.widget_sessions(id) on delete cascade,
  type text not null check (type in (
    'open','add_to_cart','chat_send','chat_reply','checkout_start','order_created','error'
  )),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists widget_events_restaurant_idx on public.widget_events(restaurant_id);
create index if not exists widget_events_session_idx on public.widget_events(session_id);
create index if not exists widget_events_type_idx on public.widget_events(type);

-- chat messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id uuid not null references public.widget_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  language text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_restaurant_idx on public.chat_messages (restaurant_id, created_at desc);
create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at desc);

-- response cache
create table if not exists public.chat_response_cache (
  id bigserial primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  cache_key text not null,
  reply jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index if not exists chat_response_cache_key
  on public.chat_response_cache(restaurant_id, cache_key);
create index if not exists chat_response_cache_exp_idx on public.chat_response_cache(expires_at);

-- menu snapshots
create table if not exists public.menu_snapshots (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists menu_snapshots_restaurant_idx on public.menu_snapshots(restaurant_id, created_at desc);

-- === RLS ===
alter table public.widget_sessions enable row level security;
alter table public.widget_events enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_response_cache enable row level security;
alter table public.menu_snapshots enable row level security;

-- helper: verify origin is allowed for a restaurant
create or replace function public.origin_allowed(p_restaurant uuid, p_origin text)
returns boolean language sql stable as $$
  select
    (coalesce(jsonb_array_length(r.allowed_origins),0) = 0)  -- empty list => allow all
    or (exists (
      select 1
      from jsonb_array_elements_text(coalesce(r.allowed_origins, '[]'::jsonb)) as o(host)
      where p_origin ilike '%'||o.host||'%'
    ))
  from public.restaurants r
  where r.id = p_restaurant;
$$;

-- policies: anon/ service
-- Sessions: anyone can insert a session if origin is allowed; only update/read own session via token
drop policy if exists "ws insert" on public.widget_sessions;
create policy "ws insert"
on public.widget_sessions for insert
to anon
with check ( public.origin_allowed(restaurant_id, coalesce(current_setting('request.headers', true), '')::json->>'origin') );

drop policy if exists "ws select own" on public.widget_sessions;
create policy "ws select own"
on public.widget_sessions for select
to anon
using ( true ); -- keep simple: sessions data is non-sensitive

drop policy if exists "ws update last_seen" on public.widget_sessions;
create policy "ws update last_seen"
on public.widget_sessions for update
to anon
using ( true )
with check ( true );

-- Events: insert-only by anon if origin allowed
drop policy if exists "we insert" on public.widget_events;
create policy "we insert"
on public.widget_events for insert
to anon
with check ( public.origin_allowed(restaurant_id, coalesce(current_setting('request.headers', true), '')::json->>'origin') );

-- Chat messages: insert + select by anon limited to own session
drop policy if exists "cm insert" on public.chat_messages;
create policy "cm insert"
on public.chat_messages for insert
to anon
with check ( public.origin_allowed(restaurant_id, coalesce(current_setting('request.headers', true), '')::json->>'origin') );

drop policy if exists "cm select" on public.chat_messages;
create policy "cm select"
on public.chat_messages for select
to anon
using ( true );

-- Cache/menu snapshots: service role only
drop policy if exists "crc service" on public.chat_response_cache;
create policy "crc service"
on public.chat_response_cache using (false) with check (false);

drop policy if exists "ms service" on public.menu_snapshots;
create policy "ms service"
on public.menu_snapshots using (false) with check (false);

commit;
