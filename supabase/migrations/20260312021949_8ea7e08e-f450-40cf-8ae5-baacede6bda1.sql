
-- ═══════════════════════════════════════
-- FASE 1: Fundação Multi-Tenant Aprimorada
-- ═══════════════════════════════════════

-- 1. EVOLUIR TABELA TENANTS
-- Adicionar slug, plan, status de licenciamento, license_key, valid_until, metadata
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'solo_pro',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS license_key TEXT,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Gerar slugs únicos para tenants existentes
UPDATE public.tenants 
SET slug = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '.', ''), '/', ''))
WHERE slug IS NULL;

-- Gerar license_keys para existentes
UPDATE public.tenants 
SET license_key = 'WF-' || UPPER(SUBSTRING(id::TEXT, 1, 8))
WHERE license_key IS NULL;

-- Tornar slug UNIQUE e NOT NULL após preenchimento
ALTER TABLE public.tenants ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_license_key ON public.tenants(license_key);

-- 2. EVOLUIR TABELA LICENSES com campos Whatsflow
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS base_devices_web INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_devices_meta INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_attendants INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_devices_web INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_devices_meta INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_attendants INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_ai_module BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_agents_limit INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS facilite_plan TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS facilite_monthly_hours INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_implantacao_starter BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_value DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';

-- Atualizar licenças existentes com base_attendants correto
UPDATE public.licenses SET base_attendants = 
  CASE WHEN plan = 'profissional' THEN 3 ELSE 1 END
WHERE base_attendants = 1;

-- 3. CRIAR TABELA AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_role TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SuperAdmin vê tudo, tenants veem só seus logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'gestor')
    OR tenant_id IN (SELECT public.get_my_tenant_ids())
  );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. CRIAR TABELA LICENSE_HISTORY
CREATE TABLE IF NOT EXISTS public.license_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  changed_by UUID,
  previous_plan TEXT,
  new_plan TEXT,
  changes JSONB DEFAULT '{}',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.license_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage license history" ON public.license_history
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'gestor'))
  WITH CHECK (public.get_my_role() IN ('admin', 'gestor'));

CREATE POLICY "Tenants can view own license history" ON public.license_history
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_my_tenant_ids()));

-- 5. CRIAR TABELA NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_my_tenant_ids()));

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.get_my_tenant_ids()));

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 6. FUNÇÕES AUXILIARES

-- Verifica se é superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Registra ação no audit_log
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_resource TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_logs (actor_id, actor_role, tenant_id, action, resource, resource_id, metadata)
  SELECT 
    auth.uid(),
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid() LIMIT 1),
    p_action, p_resource, p_resource_id, p_metadata;
$$;

-- Calcula MRR de uma licença
CREATE OR REPLACE FUNCTION public.calculate_mrr(p_license_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lic RECORD;
  base_price DECIMAL := 0;
  web_price DECIMAL := 0;
  meta_price DECIMAL := 0;
  att_price DECIMAL := 0;
  ai_price DECIMAL := 0;
  fac_price DECIMAL := 0;
BEGIN
  SELECT * INTO lic FROM public.licenses WHERE id = p_license_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Base plan
  IF lic.plan = 'profissional' THEN base_price := 359;
  ELSE base_price := 259; END IF;

  -- Extra Web devices (tier pricing)
  IF lic.extra_devices_web BETWEEN 1 AND 5 THEN web_price := lic.extra_devices_web * 150;
  ELSIF lic.extra_devices_web BETWEEN 6 AND 20 THEN web_price := lic.extra_devices_web * 125;
  ELSIF lic.extra_devices_web > 20 THEN web_price := lic.extra_devices_web * 100;
  END IF;

  -- Extra Meta devices
  IF lic.extra_devices_meta BETWEEN 1 AND 5 THEN meta_price := lic.extra_devices_meta * 100;
  ELSIF lic.extra_devices_meta BETWEEN 6 AND 20 THEN meta_price := lic.extra_devices_meta * 80;
  ELSIF lic.extra_devices_meta > 20 THEN meta_price := lic.extra_devices_meta * 60;
  END IF;

  -- Extra Attendants
  IF lic.extra_attendants BETWEEN 1 AND 5 THEN att_price := lic.extra_attendants * 80;
  ELSIF lic.extra_attendants BETWEEN 6 AND 10 THEN att_price := lic.extra_attendants * 75;
  ELSIF lic.extra_attendants BETWEEN 11 AND 20 THEN att_price := lic.extra_attendants * 70;
  ELSIF lic.extra_attendants > 20 THEN att_price := lic.extra_attendants * 60;
  END IF;

  -- AI Module
  IF lic.has_ai_module THEN ai_price := 350; END IF;

  -- Facilite
  IF lic.facilite_plan = 'basico' THEN fac_price := 250;
  ELSIF lic.facilite_plan = 'intermediario' THEN fac_price := 700;
  ELSIF lic.facilite_plan = 'avancado' THEN fac_price := 1500;
  END IF;

  RETURN base_price + web_price + meta_price + att_price + ai_price + fac_price;
END;
$$;

-- 7. INDEXES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_license_history_tenant ON public.license_history(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(tenant_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON public.licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_negocios_tenant_pipeline ON public.negocios(tenant_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_negocios_status ON public.negocios(status);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
