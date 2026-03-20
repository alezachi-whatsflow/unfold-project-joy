-- =========================================================================
-- FASE 1 — Tabelas do Fluxo Comercial (Checkout, Upsell, Ativação)
-- Whatsflow Finance | v2 Corrigido
-- NÃO altera tabelas existentes.
-- =========================================================================

-- 1. TABELA checkout_sessions
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  checkout_type TEXT NOT NULL
    CHECK (checkout_type IN ('new_account', 'upsell', 'renewal')),

  -- Se upsell ou renewal: account que está comprando
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  -- Se checkout gerado por WhiteLabel para seu futuro cliente
  whitelabel_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  -- Dados do comprador (preenchidos no formulário)
  buyer_name TEXT,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_document TEXT,     -- CPF ou CNPJ
  company_name TEXT,
  company_slug TEXT,       -- gerado automaticamente, editável

  -- O que foi contratado (snapshot do pedido no momento da compra)
  plan TEXT NOT NULL,
  extra_devices_web INT DEFAULT 0,
  extra_devices_meta INT DEFAULT 0,
  extra_attendants INT DEFAULT 0,
  has_ai_module BOOLEAN DEFAULT false,
  facilite_plan TEXT DEFAULT 'none',
  has_implantacao_starter BOOLEAN DEFAULT false,
  billing_cycle TEXT DEFAULT 'monthly',

  -- Valores calculados e travados no momento do checkout
  monthly_value DECIMAL(10,2) NOT NULL,
  setup_fee DECIMAL(10,2) DEFAULT 0,       -- Implantação Starter
  first_charge DECIMAL(10,2) NOT NULL,     -- monthly_value + setup_fee

  -- Status do checkout
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),

  -- Dados vindos do Asaas (preenchidos pela Edge Function)
  asaas_customer_id TEXT,
  asaas_payment_id TEXT UNIQUE,
  asaas_payment_link TEXT,
  payment_method TEXT CHECK (payment_method IN ('pix', 'boleto', 'credit_card')),
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_status ON public.checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_email ON public.checkout_sessions(buyer_email);
CREATE INDEX IF NOT EXISTS idx_checkout_payment ON public.checkout_sessions(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_checkout_account ON public.checkout_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_checkout_wl ON public.checkout_sessions(whitelabel_id);
CREATE INDEX IF NOT EXISTS idx_checkout_type_status ON public.checkout_sessions(checkout_type, status);


-- 2. TABELA activation_tokens
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.activation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  checkout_session_id UUID NOT NULL REFERENCES public.checkout_sessions(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id),

  -- Para upsell: quem confirmou
  used_by_profile_id UUID REFERENCES public.profiles(id),

  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'used', 'expired')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_activation_token ON public.activation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_activation_status ON public.activation_tokens(status, expires_at);


-- 3. TABELA license_history (IF NOT EXISTS — pode já existir da Fase 5 do MultiTenant)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.license_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  changed_by_id UUID,
  changed_by_role TEXT,

  change_type TEXT CHECK (change_type IN (
    'initial', 'upsell', 'renewal', 'admin_edit',
    'suspension', 'reactivation', 'cancellation'
  )),

  previous_state JSONB,
  new_state JSONB,
  checkout_session_id UUID REFERENCES public.checkout_sessions(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_history_account ON public.license_history(account_id, created_at DESC);


-- 4. FUNÇÃO calculate_checkout_value
-- (usada no checkout para preview em tempo real - safe to call from frontend via RPC)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.calculate_checkout_value(
  p_plan TEXT,
  p_extra_devices_web INT DEFAULT 0,
  p_extra_devices_meta INT DEFAULT 0,
  p_extra_attendants INT DEFAULT 0,
  p_has_ai_module BOOLEAN DEFAULT false,
  p_facilite_plan TEXT DEFAULT 'none',
  p_has_implantacao_starter BOOLEAN DEFAULT false
)
RETURNS TABLE (monthly_value DECIMAL, setup_fee DECIMAL, first_charge DECIMAL)
AS $$
DECLARE
  v_base    DECIMAL;
  v_web     DECIMAL := 0;
  v_meta    DECIMAL := 0;
  v_att     DECIMAL := 0;
  v_ai      DECIMAL := 0;
  v_fac     DECIMAL := 0;
  v_setup   DECIMAL := 0;
BEGIN
  -- Plano base
  v_base := CASE p_plan WHEN 'solo_pro' THEN 259 ELSE 359 END;

  -- Extra dispositivos Web (tier pricing)
  IF p_extra_devices_web > 0 THEN
    v_web := p_extra_devices_web * CASE
      WHEN p_extra_devices_web <= 5  THEN 150
      WHEN p_extra_devices_web <= 20 THEN 125
      ELSE 100 END;
  END IF;

  -- Extra dispositivos Meta (tier pricing)
  IF p_extra_devices_meta > 0 THEN
    v_meta := p_extra_devices_meta * CASE
      WHEN p_extra_devices_meta <= 5  THEN 100
      WHEN p_extra_devices_meta <= 20 THEN 80
      ELSE 60 END;
  END IF;

  -- Extra atendentes (tier pricing)
  IF p_extra_attendants > 0 THEN
    v_att := p_extra_attendants * CASE
      WHEN p_extra_attendants <= 5  THEN 80
      WHEN p_extra_attendants <= 10 THEN 75
      WHEN p_extra_attendants <= 20 THEN 70
      ELSE 60 END;
  END IF;

  -- Módulo I.A.
  IF p_has_ai_module THEN v_ai := 350; END IF;

  -- Implantação Starter (taxa única)
  IF p_has_implantacao_starter THEN v_setup := 2000; END IF;

  -- Facilite
  v_fac := CASE p_facilite_plan
    WHEN 'basico'        THEN 250
    WHEN 'intermediario' THEN 700
    WHEN 'avancado'      THEN 1500
    ELSE 0 END;

  RETURN QUERY SELECT
    (v_base + v_web + v_meta + v_att + v_ai + v_fac)::DECIMAL,
    v_setup::DECIMAL,
    (v_base + v_web + v_meta + v_att + v_ai + v_fac + v_setup)::DECIMAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 5. FUNÇÃO get_expiring_licenses_days
-- (usada pela Edge Function de notificações)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_expiring_licenses_days()
RETURNS TABLE (
  account_id UUID,
  days_left INT,
  valid_until TIMESTAMPTZ,
  account_type TEXT,
  whitelabel_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.account_id,
    DATE_PART('day', l.valid_until - NOW())::INT AS days_left,
    l.valid_until,
    a.account_type,
    a.whitelabel_id
  FROM public.licenses l
  JOIN public.accounts a ON a.id = l.account_id
  WHERE l.status = 'active'
    AND l.valid_until IS NOT NULL
    AND DATE_PART('day', l.valid_until - NOW()) IN (30, 15, 7, 3, 1);
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- TESTES FASE 1
-- =========================================================================
-- Teste 1: plano profissional simples com implantação
-- SELECT * FROM calculate_checkout_value('profissional',0,0,0,false,'none',true);
-- Esperado: monthly=359, setup=2000, first_charge=2359

-- Teste 2: plano profissional com 5 web + I.A. + facilite básico
-- SELECT * FROM calculate_checkout_value('profissional',5,0,0,true,'basico',false);
-- web=750, ai=350, fac=250 → monthly=1709, setup=0, first_charge=1709
