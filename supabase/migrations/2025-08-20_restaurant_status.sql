-- Function to check if restaurant is open (timezone-aware, safe defaults)
create or replace function public.is_restaurant_open(
  p_restaurant_id uuid,
  p_at timestamptz default now()
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- evaluate in Europe/Stockholm
  ts_local timestamptz := timezone('Europe/Stockholm', p_at);
  current_day_val text := to_char(ts_local, 'fmday'); -- e.g., 'monday'
  current_time_val time := (ts_local)::time;
  oh jsonb;
  wd jsonb;
  open_txt text;
  close_txt text;
  t_open time;
  t_close time;
begin
  -- load hours
  select opening_hours into oh
  from public.restaurants
  where id = p_restaurant_id;

  -- Safe default: if no hours configured, consider open
  if oh is null then
    return true;
  end if;

  wd := oh -> current_day_val;  -- e.g., hours['monday']
  if wd is null then
    return true;
  end if;

  open_txt := wd ->> 'open';
  close_txt := wd ->> 'close';

  -- If explicitly null/empty, treat as closed for this day
  if open_txt is null or close_txt is null or open_txt = '' or close_txt = '' then
    return false;
  end if;

  t_open := open_txt::time;
  t_close := close_txt::time;

  -- Same-day window (e.g., 09:00–17:00)
  if t_open < t_close then
    return current_time_val >= t_open and current_time_val < t_close;
  end if;

  -- Overnight window (e.g., 18:00–02:00)
  -- Open if time >= open OR time < close
  return (current_time_val >= t_open) or (current_time_val < t_close);
end;
$$;
