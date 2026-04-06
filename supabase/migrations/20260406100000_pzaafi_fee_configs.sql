-- ============================================================
-- PZAAFI FEE CONFIGURATION
-- 3-layer fee model: Gateway + Pzaafi + Tenant Markup
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pzaafi_fee_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL, -- pzaafi_organizations.id
  tenant_id UUID NOT NULL,

  -- PIX fees
  pix_gateway_fee_pct DECIMAL(6,4) NOT NULL DEFAULT 0.99,   -- % charged by gateway (Asaas)
  pix_pzaafi_fee_pct DECIMAL(6,4) NOT NULL DEFAULT 0.00,    -- % charged by Whatsflow
  pix_pzaafi_fee_fixed DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- fixed R$ by Whatsflow

  -- Card fees
  card_gateway_fee_pct DECIMAL(6,4) NOT NULL DEFAULT 2.99,     -- % charged by gateway
  card_gateway_fee_fixed DECIMAL(10,2) NOT NULL DEFAULT 0.49,  -- fixed R$ by gateway
  card_pzaafi_fee_pct DECIMAL(6,4) NOT NULL DEFAULT 0.00,      -- % by Whatsflow
  card_pzaafi_fee_fixed DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- fixed R$ by Whatsflow

  -- Boleto fees
  boleto_gateway_fee DECIMAL(10,2) NOT NULL DEFAULT 1.15,  -- fixed R$ by gateway
  boleto_pzaafi_fee DECIMAL(10,2) NOT NULL DEFAULT 0.35,   -- fixed R$ by Whatsflow

  -- Tenant markup (optional — tenant passes to buyer)
  tenant_markup_pct DECIMAL(6,4) NOT NULL DEFAULT 0.00,      -- % markup by tenant
  tenant_markup_fixed DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- fixed R$ markup by tenant
  tenant_markup_enabled BOOLEAN NOT NULL DEFAULT false,       -- tenant opted to add markup

  -- Who absorbs the base fees?
  fee_payer TEXT NOT NULL DEFAULT 'seller' CHECK (fee_payer IN ('seller', 'buyer', 'split')),
  -- seller = tenant pays fees (default)
  -- buyer = buyer pays all fees
  -- split = buyer pays tenant markup, seller pays gateway+pzaafi

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id)
);

ALTER TABLE public.pzaafi_fee_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.pzaafi_fee_configs FOR ALL TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_pzaafi_fees_org ON public.pzaafi_fee_configs (organization_id);
CREATE INDEX idx_pzaafi_fees_tenant ON public.pzaafi_fee_configs (tenant_id);

GRANT ALL ON public.pzaafi_fee_configs TO authenticated;

COMMENT ON TABLE public.pzaafi_fee_configs IS 'Configuracao de taxas por organizacao Pzaafi: Gateway + Pzaafi + Markup do Tenant. Nivel: TENANT (leitura), NEXUS (escrita gateway/pzaafi).';
