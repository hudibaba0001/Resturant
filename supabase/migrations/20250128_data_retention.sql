-- 2025-01-28_data_retention.sql
-- Data retention policies and ops queries for observability

BEGIN;

-- 1) Create immutable functions for retention calculations
CREATE OR REPLACE FUNCTION public.calculate_order_status_expiry(created_at timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT created_at + interval '365 days';
$$;

CREATE OR REPLACE FUNCTION public.calculate_widget_events_expiry(created_at timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT created_at + interval '90 days';
$$;

-- 2) Add retention columns for TTL using the immutable functions
ALTER TABLE public.order_status_events 
ADD COLUMN IF NOT EXISTS expires_at timestamptz 
GENERATED ALWAYS AS (public.calculate_order_status_expiry(created_at)) STORED;

ALTER TABLE public.widget_events 
ADD COLUMN IF NOT EXISTS expires_at timestamptz 
GENERATED ALWAYS AS (public.calculate_widget_events_expiry(created_at)) STORED;

-- 3) Create indexes for retention queries
CREATE INDEX IF NOT EXISTS order_status_events_expires_idx 
ON public.order_status_events(expires_at);

CREATE INDEX IF NOT EXISTS widget_events_expires_idx 
ON public.widget_events(expires_at);

-- 4) Optional: Enable pg_cron for automated cleanup (requires extension)
-- Uncomment if pg_cron is available in your Supabase plan
/*
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 3:15 AM
SELECT cron.schedule(
  'cleanup-expired-events',
  '15 3 * * *',
  $$
  DELETE FROM public.order_status_events 
  WHERE expires_at < now();
  
  DELETE FROM public.widget_events 
  WHERE expires_at < now();
  $$
);
*/

-- 5) Create views for ops monitoring
CREATE OR REPLACE VIEW public.ops_order_metrics AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_changes,
  COUNT(CASE WHEN from_status != to_status THEN 1 END) as status_changes,
  COUNT(CASE WHEN reason IS NOT NULL THEN 1 END) as with_reasons
FROM public.order_status_events 
WHERE created_at > now() - interval '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

CREATE OR REPLACE VIEW public.ops_conflict_metrics AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_events,
  COUNT(CASE WHEN type = 'order_status_conflict' THEN 1 END) as conflicts,
  COUNT(CASE WHEN type = 'order_status_error' THEN 1 END) as errors
FROM public.widget_events 
WHERE created_at > now() - interval '24 hours'
  AND type IN ('order_status_conflict', 'order_status_error', 'order_status_success')
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- 6) Grant access to ops views
GRANT SELECT ON public.ops_order_metrics TO authenticated;
GRANT SELECT ON public.ops_conflict_metrics TO authenticated;

COMMIT;
