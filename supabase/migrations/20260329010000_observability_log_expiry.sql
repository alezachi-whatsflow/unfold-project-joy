-- ══════════════════════════════════════════════════════════════
-- O5: LOG EXPIRY — Automated cleanup of stale logs
-- Runs daily at 03:00 AM UTC via pg_cron
-- PROTECTED: data_lifecycle_audit is NEVER touched (LGPD/GDPR)
-- ══════════════════════════════════════════════════════════════

-- pg_cron already enabled on this project

-- ── 1. message_logs: retain 90 days ──────────────────────────
SELECT cron.schedule(
  'cleanup-message-logs-90d',
  '0 3 * * *',  -- daily at 03:00 UTC
  $$DELETE FROM public.message_logs WHERE timestamp < now() - interval '90 days'$$
);

-- ── 2. nexus_audit_logs: retain 180 days ─────────────────────
SELECT cron.schedule(
  'cleanup-nexus-audit-logs-180d',
  '5 3 * * *',  -- daily at 03:05 UTC
  $$DELETE FROM public.nexus_audit_logs WHERE created_at < now() - interval '180 days'$$
);

-- ── 3. tenant_sync_logs: retain 90 days ──────────────────────
SELECT cron.schedule(
  'cleanup-sync-logs-90d',
  '10 3 * * *',  -- daily at 03:10 UTC
  $$DELETE FROM public.tenant_sync_logs WHERE started_at < now() - interval '90 days'$$
);

-- ── 4. audit_logs (general): retain 180 days ─────────────────
SELECT cron.schedule(
  'cleanup-audit-logs-180d',
  '15 3 * * *',  -- daily at 03:15 UTC
  $$DELETE FROM public.audit_logs WHERE created_at < now() - interval '180 days'$$
);

-- ── 5. data_lifecycle_queue (completed jobs): retain 30 days ─
SELECT cron.schedule(
  'cleanup-lifecycle-queue-30d',
  '20 3 * * *',  -- daily at 03:20 UTC
  $$DELETE FROM public.data_lifecycle_queue WHERE status IN ('completed', 'skipped') AND completed_at < now() - interval '30 days'$$
);

-- ══════════════════════════════════════════════════════════════
-- PROTECTED TABLE (NEVER CLEANED):
--   data_lifecycle_audit — immutable LGPD/GDPR compliance log
-- ══════════════════════════════════════════════════════════════

-- ── 6. Materialized view for Nexus health dashboard ──────────
-- Avoids aggregating 15k licenses in real-time queries
CREATE MATERIALIZED VIEW IF NOT EXISTS nexus_health_snapshot AS
SELECT
  (SELECT count(*) FROM licenses) AS total_licenses,
  (SELECT count(*) FROM licenses WHERE status = 'active') AS active_licenses,
  (SELECT coalesce(sum(monthly_value), 0) FROM licenses WHERE status = 'active') AS mrr_total,
  (SELECT count(*) FROM licenses WHERE status != 'active') AS inactive_licenses,
  (SELECT count(*) FROM licenses WHERE expires_at BETWEEN now() AND now() + interval '30 days' AND status = 'active') AS expiring_30d,
  (SELECT count(*) FROM licenses WHERE expires_at BETWEEN now() AND now() + interval '15 days' AND status = 'active') AS critical_15d,
  (SELECT count(*) FROM licenses WHERE has_ai_module = true AND status = 'active') AS ai_module_count,
  (SELECT count(*) FROM nexus_tickets WHERE status = 'aberto') AS open_tickets,
  (SELECT count(*) FROM whatsapp_instances WHERE status = 'connected') AS connected_instances,
  (SELECT count(*) FROM whatsapp_instances WHERE status != 'connected') AS disconnected_instances,
  now() AS snapshot_at;

-- Create unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_nexus_health_snapshot ON nexus_health_snapshot (snapshot_at);

-- Refresh every 30 seconds via pg_cron
SELECT cron.schedule(
  'refresh-nexus-health-snapshot',
  '*/1 * * * *',  -- every 1 minute (pg_cron minimum)
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY nexus_health_snapshot$$
);

-- Grant read access to Nexus users only
GRANT SELECT ON nexus_health_snapshot TO authenticated;
