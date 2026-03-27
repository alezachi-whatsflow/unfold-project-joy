-- Master tag list per tenant (used by onboarding AI + tag manager)
CREATE TABLE IF NOT EXISTS public.tenant_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  category TEXT DEFAULT 'general', -- general, lead_status, priority, source
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_tenant_tags_tenant ON tenant_tags(tenant_id);
ALTER TABLE public.tenant_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on tenant_tags"
  ON public.tenant_tags FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

-- Add unique constraint on departments for upsert support
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departments_tenant_name_key'
  ) THEN
    ALTER TABLE public.departments ADD CONSTRAINT departments_tenant_name_key UNIQUE(tenant_id, name);
  END IF;
END $$;
