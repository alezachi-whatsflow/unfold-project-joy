-- ══════════════════════════════════════════════════════════════
-- O1: nexus_system_metrics — Aggregated system health data
-- Written by obs:aggregator worker, read by Nexus dashboard
-- RLS: INSERT/UPDATE = service_role only, SELECT = nexus users
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.nexus_system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_meta JSONB DEFAULT '{}',
  bucket_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(metric_key, bucket_at)
);

-- Indexes for fast dashboard reads
CREATE INDEX IF NOT EXISTS idx_nsm_key_bucket ON nexus_system_metrics(metric_key, bucket_at DESC);
CREATE INDEX IF NOT EXISTS idx_nsm_bucket ON nexus_system_metrics(bucket_at DESC);

-- RLS: strict access control
ALTER TABLE public.nexus_system_metrics ENABLE ROW LEVEL SECURITY;

-- Only service_role can write (worker uses service key)
CREATE POLICY "service_role_write_metrics" ON public.nexus_system_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Nexus users can read
CREATE POLICY "nexus_read_metrics" ON public.nexus_system_metrics
  FOR SELECT TO authenticated USING (public.is_nexus_user());

-- Grant
GRANT SELECT ON public.nexus_system_metrics TO authenticated;
GRANT ALL ON public.nexus_system_metrics TO service_role;

-- ══════════════════════════════════════════════════════════════
-- O3: Enhanced materialized view with error metrics
-- Replaces the basic one from previous migration
-- ══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS nexus_health_snapshot;

CREATE MATERIALIZED VIEW nexus_health_snapshot AS
SELECT
  -- License metrics
  (SELECT count(*) FROM licenses) AS total_licenses,
  (SELECT count(*) FROM licenses WHERE status = 'active') AS active_licenses,
  (SELECT coalesce(sum(monthly_value), 0) FROM licenses WHERE status = 'active') AS mrr_total,
  (SELECT count(*) FROM licenses WHERE status != 'active') AS inactive_licenses,
  (SELECT count(*) FROM licenses WHERE status = 'blocked') AS blocked_licenses,
  (SELECT count(*) FROM licenses WHERE expires_at BETWEEN now() AND now() + interval '30 days' AND status = 'active') AS expiring_30d,
  (SELECT count(*) FROM licenses WHERE expires_at BETWEEN now() AND now() + interval '15 days' AND status = 'active') AS critical_15d,
  (SELECT count(*) FROM licenses WHERE has_ai_module = true AND status = 'active') AS ai_module_count,

  -- Instance health
  (SELECT count(*) FROM whatsapp_instances) AS total_instances,
  (SELECT count(*) FROM whatsapp_instances WHERE status = 'connected') AS connected_instances,
  (SELECT count(*) FROM whatsapp_instances WHERE status != 'connected') AS disconnected_instances,
  (SELECT count(*) FROM whatsapp_instances WHERE webhook_url IS NULL OR webhook_url = '') AS no_webhook_instances,

  -- Channel integrations
  (SELECT count(*) FROM channel_integrations WHERE provider = 'WABA' AND status = 'active') AS meta_active,
  (SELECT count(*) FROM channel_integrations WHERE provider = 'TELEGRAM' AND status = 'active') AS telegram_active,
  (SELECT count(*) FROM channel_integrations WHERE provider = 'MERCADOLIVRE' AND status = 'active') AS ml_active,

  -- Support
  (SELECT count(*) FROM nexus_tickets WHERE status = 'aberto') AS open_tickets,
  (SELECT count(*) FROM nexus_tickets WHERE status = 'em_andamento') AS in_progress_tickets,

  -- Error rate (last 1 minute from nexus_system_metrics)
  (SELECT coalesce(metric_value, 0) FROM nexus_system_metrics
   WHERE metric_key = 'error_rate_1m' ORDER BY bucket_at DESC LIMIT 1) AS error_rate_1m,

  -- DLQ size
  (SELECT coalesce(metric_value, 0) FROM nexus_system_metrics
   WHERE metric_key = 'dlq_size' ORDER BY bucket_at DESC LIMIT 1) AS dlq_size,

  -- WhiteLabel count
  (SELECT count(*) FROM licenses WHERE license_type = 'whitelabel') AS whitelabel_count,

  -- Tenant count
  (SELECT count(*) FROM tenants) AS active_tenants,

  -- Timestamp
  now() AS snapshot_at;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_nexus_health_snapshot_at ON nexus_health_snapshot(snapshot_at);

-- Grant read to authenticated (RLS on nexus_health_snapshot not supported, controlled at app level)
GRANT SELECT ON nexus_health_snapshot TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- Auto-cleanup: nexus_system_metrics older than 7 days
-- ══════════════════════════════════════════════════════════════
SELECT cron.schedule(
  'cleanup-system-metrics-7d',
  '25 3 * * *',
  $$DELETE FROM public.nexus_system_metrics WHERE bucket_at < now() - interval '7 days'$$
);
