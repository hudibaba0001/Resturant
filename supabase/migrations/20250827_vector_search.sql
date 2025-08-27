-- Vector similarity search function for menu items
create or replace function match_menu_items(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_restaurant_id uuid
)
returns table (
  id text,
  name text,
  description text,
  allergens text[],
  category text,
  price_cents integer,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    mie.item_id,
    mi.name,
    mi.description,
    mi.allergens,
    mi.category,
    mi.price_cents,
    1 - (mie.embedding <=> query_embedding) as similarity
  from menu_item_embeddings mie
  join menu_items mi on mi.id = mie.item_id and mi.restaurant_id = mie.restaurant_id
  where mie.restaurant_id = p_restaurant_id
    and 1 - (mie.embedding <=> query_embedding) > match_threshold
  order by mie.embedding <=> query_embedding
  limit match_count;
end;
$$;
