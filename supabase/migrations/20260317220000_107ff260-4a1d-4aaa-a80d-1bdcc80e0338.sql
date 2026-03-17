
-- Table to define the staging (source) tenant and track sync operations
CREATE TABLE public.tenant_sync_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  sync_scope jsonb NOT NULL DEFAULT '["layout","settings","pipelines","commission_rules","dunning_rules","checkout_sources"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_tenant_id)
);

-- Log each sync execution
CREATE TABLE public.tenant_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_config_id uuid NOT NULL REFERENCES public.tenant_sync_configs(id) ON DELETE CASCADE,
  source_tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  target_tenant_ids uuid[] NOT NULL DEFAULT '{}',
  scope text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  result jsonb DEFAULT '{}'::jsonb,
  executed_by uuid REFERENCES auth.users(id),
  items_synced integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  error_details jsonb DEFAULT '[]'::jsonb
);

-- RLS
ALTER TABLE public.tenant_sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nexus users can manage sync configs"
  ON public.tenant_sync_configs FOR ALL
  TO authenticated
  USING (is_nexus_user())
  WITH CHECK (is_nexus_user());

CREATE POLICY "Nexus users can manage sync logs"
  ON public.tenant_sync_logs FOR ALL
  TO authenticated
  USING (is_nexus_user())
  WITH CHECK (is_nexus_user());
