
-- ============================================================
-- FASE 1: ÍNDICES DE PERFORMANCE
-- ============================================================

-- Payments: consultas por tenant + status + vencimento
CREATE INDEX IF NOT EXISTS idx_asaas_payments_tenant_status_due 
  ON public.asaas_payments(tenant_id, status, due_date);

-- Negócios: pipeline por tenant + status
CREATE INDEX IF NOT EXISTS idx_negocios_tenant_status 
  ON public.negocios(tenant_id, status);

-- Message logs: busca por sessão + ordenação temporal
CREATE INDEX IF NOT EXISTS idx_message_logs_session_ts 
  ON public.message_logs(session_id, timestamp DESC);

-- WhatsApp contacts: busca por instância + telefone
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_inst_phone 
  ON public.whatsapp_contacts(instance_name, phone);

-- Asaas revenue: consultas por tenant + data
CREATE INDEX IF NOT EXISTS idx_asaas_revenue_tenant_date 
  ON public.asaas_revenue(tenant_id, date DESC);

-- Asaas expenses: consultas por tenant + data
CREATE INDEX IF NOT EXISTS idx_asaas_expenses_tenant_date 
  ON public.asaas_expenses(tenant_id, date DESC);

-- User tenants: lookup rápido por user_id
CREATE INDEX IF NOT EXISTS idx_user_tenants_user 
  ON public.user_tenants(user_id);

-- Profiles: lookup por role (usado pelo RLS)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON public.profiles(role);

-- ============================================================
-- FASE 2: TABELA DE LICENÇAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'basic',
  status text NOT NULL DEFAULT 'active',
  max_users integer NOT NULL DEFAULT 5,
  max_instances integer NOT NULL DEFAULT 2,
  features jsonb NOT NULL DEFAULT '{}',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver licenças dos seus tenants
CREATE POLICY "Users can view own license"
  ON public.licenses FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_my_tenant_ids()));

-- Apenas admins podem gerenciar licenças
CREATE POLICY "Admins can manage licenses"
  ON public.licenses FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Criar licença padrão para tenants existentes
INSERT INTO public.licenses (tenant_id, plan, status, max_users, max_instances)
SELECT id, 'basic', 'active', 5, 2
FROM public.tenants
WHERE NOT EXISTS (
  SELECT 1 FROM public.licenses l WHERE l.tenant_id = tenants.id
)
ON CONFLICT DO NOTHING;

-- Índice para lookup por tenant
CREATE INDEX IF NOT EXISTS idx_licenses_tenant 
  ON public.licenses(tenant_id);
