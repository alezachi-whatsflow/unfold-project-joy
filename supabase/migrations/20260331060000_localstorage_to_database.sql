-- ============================================================
-- Migrate all business data from localStorage to database
-- Creates tables for: products, fiscal config, fiscal notes,
-- tax config, certificates, checkout connections, billing presets
-- ============================================================

-- 1. PRODUCTS TABLE (most critical — shared with sales pipeline)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Plano Base',
  type TEXT NOT NULL DEFAULT 'recurring' CHECK (type IN ('recurring', 'one_time')),
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'semiannual', 'annual', 'one_time')),
  -- Costs
  cogs DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  support_cost DECIMAL(12,2) DEFAULT 0,
  sales_commission_pct DECIMAL(5,2) DEFAULT 0,
  -- Metrics (computed but cached for dashboard)
  active_customers INT DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  mrr DECIMAL(12,2) DEFAULT 0,
  -- Features
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.products FOR ALL
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_products_tenant ON public.products (tenant_id);

-- 2. FISCAL CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS public.fiscal_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  cnpj TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  -- Address
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  codigo_ibge TEXT,
  -- Tax
  regime_tributario TEXT DEFAULT 'simples_nacional',
  natureza_iss TEXT DEFAULT 'tributacao_municipio',
  -- Config
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.fiscal_configurations FOR ALL
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

-- 3. FISCAL NOTES TABLE (Notas Fiscais)
CREATE TABLE IF NOT EXISTS public.fiscal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  numero TEXT,
  tipo TEXT DEFAULT 'NFS-e' CHECK (tipo IN ('NFS-e', 'NF-e', 'NFC-e')),
  cliente_nome TEXT,
  cliente_cpf_cnpj TEXT,
  cliente_email TEXT,
  cliente_endereco TEXT,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0,
  impostos DECIMAL(12,2) DEFAULT 0,
  data_emissao TIMESTAMPTZ,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('emitida', 'pendente', 'rejeitada', 'cancelada')),
  itens JSONB DEFAULT '[]',
  tributos JSONB DEFAULT '{}',
  negocio_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.fiscal_notes FOR ALL
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_fiscal_notes_tenant ON public.fiscal_notes (tenant_id, data_emissao DESC);

-- 4. TAX CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS public.tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('municipal', 'estadual', 'federal')),
  name TEXT NOT NULL,
  tax_type TEXT NOT NULL, -- ISS, ICMS, PIS, COFINS, CSLL, IRPJ, Simples
  rate DECIMAL(8,4) DEFAULT 0,
  uf TEXT, -- for estadual
  faixa_min DECIMAL(12,2), -- for simples nacional
  faixa_max DECIMAL(12,2),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.tax_configurations FOR ALL
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_tax_config_tenant ON public.tax_configurations (tenant_id, scope);

-- 5. DIGITAL CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS public.fiscal_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  certificate_type TEXT DEFAULT 'A1',
  status TEXT DEFAULT 'pendente' CHECK (status IN ('ativo', 'pendente', 'expirado', 'revogado')),
  valid_until TIMESTAMPTZ,
  environment TEXT DEFAULT 'homologacao' CHECK (environment IN ('homologacao', 'producao')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.fiscal_certificates FOR ALL
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

-- 6. CHECKOUT CONNECTIONS TABLE (SECURITY: moves API keys from localStorage)
CREATE TABLE IF NOT EXISTS public.checkout_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider_id TEXT NOT NULL, -- asaas, stripe, mercadopago, pagarme, iugu, paypal
  environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  api_key_hint TEXT, -- last 4 chars only for display
  encrypted_credentials JSONB DEFAULT '{}', -- server-side only; frontend never sees raw keys
  webhook_url TEXT,
  integration_type TEXT DEFAULT 'api',
  status TEXT DEFAULT 'active',
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_tested_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider_id, environment)
);

ALTER TABLE public.checkout_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.checkout_connections FOR ALL
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

-- 7. BILLING PRESETS TABLE
CREATE TABLE IF NOT EXISTS public.billing_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  billing_type TEXT DEFAULT 'BOLETO',
  value DECIMAL(12,2) DEFAULT 0,
  fine_value DECIMAL(8,4) DEFAULT 0,
  interest_value DECIMAL(8,4) DEFAULT 0,
  due_days INT DEFAULT 30,
  is_default BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.billing_presets FOR ALL
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

-- 8. Realtime publication for products (used by pipeline)
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- 9. Grant access
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.fiscal_configurations TO authenticated;
GRANT ALL ON public.fiscal_notes TO authenticated;
GRANT ALL ON public.tax_configurations TO authenticated;
GRANT ALL ON public.fiscal_certificates TO authenticated;
GRANT ALL ON public.checkout_connections TO authenticated;
GRANT ALL ON public.billing_presets TO authenticated;
