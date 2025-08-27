-- Enable pgvector extension
create extension if not exists vector;

-- Create embeddings table for menu items
create table if not exists public.menu_item_embeddings (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  item_id text not null,
  embedding vector(1536) not null,
  updated_at timestamptz not null default now(),
  primary key (restaurant_id, item_id)
);

-- Create vector index for efficient similarity search
create index if not exists menu_item_embeddings_vec_idx
  on public.menu_item_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Enable RLS
alter table public.menu_item_embeddings enable row level security;

-- Service role only (embeddings are internal)
create policy "embeddings_service_only" on public.menu_item_embeddings
  using (false) with check (false);
