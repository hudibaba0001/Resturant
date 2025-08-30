-- Enable RLS on widget_sessions
alter table widget_sessions enable row level security;

-- Allow anon to create sessions for active restaurants
create policy "anon can insert widget_sessions for active restaurants"
on widget_sessions for insert
to anon
with check (
  exists (
    select 1 from restaurants r
    where r.id = widget_sessions.restaurant_id
      and r.is_active = true
  )
);

-- Allow reads (coarse for MVP - we'll tighten this later)
create policy "anon can read own restaurant sessions (coarse)"
on widget_sessions for select
to anon
using (true);
