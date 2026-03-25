-- ═══════════════════════════════════════════════════════════════
-- FIX: FK constraints that block tenant deletion
--
-- ROOT CAUSE: Several tables had NO ACTION on tenant_id FK,
-- causing silent failure when Nexus tried to delete a license/tenant.
-- ═══════════════════════════════════════════════════════════════

-- Tables that were blocking tenant DELETE with NO ACTION:
ALTER TABLE asaas_revenue DROP CONSTRAINT IF EXISTS asaas_revenue_tenant_id_fkey,
  ADD CONSTRAINT asaas_revenue_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE deal_qualifications DROP CONSTRAINT IF EXISTS deal_qualifications_tenant_id_fkey,
  ADD CONSTRAINT deal_qualifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE financial_entries DROP CONSTRAINT IF EXISTS financial_entries_tenant_id_fkey,
  ADD CONSTRAINT financial_entries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_tenant_id_fkey,
  ADD CONSTRAINT whatsapp_messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_tenant_id_fkey,
  ADD CONSTRAINT webhook_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE tenant_sync_logs DROP CONSTRAINT IF EXISTS tenant_sync_logs_source_tenant_id_fkey,
  ADD CONSTRAINT tenant_sync_logs_source_tenant_id_fkey FOREIGN KEY (source_tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- profiles.license_id -> licenses.id was also blocking (SET NULL on delete)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_license_id_fkey,
  ADD CONSTRAINT profiles_license_id_fkey FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE SET NULL;

-- negocios -> tenants was missing CASCADE
ALTER TABLE negocios DROP CONSTRAINT IF EXISTS negocios_tenant_id_fkey,
  ADD CONSTRAINT negocios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
