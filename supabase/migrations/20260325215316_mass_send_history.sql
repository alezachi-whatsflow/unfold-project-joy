-- Mass send history: tracks every bulk send operation
CREATE TABLE IF NOT EXISTS public.mass_send_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  message_body TEXT,
  media_url TEXT,
  include_tags TEXT[] DEFAULT '{}',
  exclude_tags TEXT[] DEFAULT '{}',
  delay_seconds INTEGER DEFAULT 5,
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',  -- running, completed, cancelled, failed
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual message results within a batch
CREATE TABLE IF NOT EXISTS public.mass_send_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES mass_send_batches(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  contact_name TEXT,
  status TEXT DEFAULT 'pending',  -- pending, sent, failed
  error_message TEXT,
  message_id TEXT,
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_msb_tenant ON mass_send_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_msb_status ON mass_send_batches(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_msr_batch ON mass_send_results(batch_id);
CREATE INDEX IF NOT EXISTS idx_msr_status ON mass_send_results(batch_id, status);

-- RLS + GRANT
ALTER TABLE mass_send_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE mass_send_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mass_send_batches' AND policyname = 'Strict_Tenant_Isolation') THEN
    CREATE POLICY "Strict_Tenant_Isolation" ON public.mass_send_batches FOR ALL
      USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
      WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mass_send_results' AND policyname = 'Strict_Tenant_Isolation') THEN
    CREATE POLICY "Strict_Tenant_Isolation" ON public.mass_send_results FOR ALL
      USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
      WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON mass_send_batches TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mass_send_results TO anon, authenticated;