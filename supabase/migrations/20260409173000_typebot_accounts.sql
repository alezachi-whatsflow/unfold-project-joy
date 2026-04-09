CREATE TABLE IF NOT EXISTS public.typebot_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  typebot_id TEXT NOT NULL,
  typebot_url_builder TEXT NOT NULL,
  typebot_url_viewer TEXT NOT NULL,
  typebot_token TEXT NOT NULL,
  login_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_typebot_accounts_tenant_id
  ON public.typebot_accounts (tenant_id);

ALTER TABLE public.typebot_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation on typebot_accounts" ON public.typebot_accounts;
CREATE POLICY "Tenant isolation on typebot_accounts"
  ON public.typebot_accounts FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
