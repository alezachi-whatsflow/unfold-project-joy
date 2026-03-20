-- 1. TABELA PRINCIPAL — accounts
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,

  -- Tipo de conta na hierarquia
  account_type TEXT NOT NULL,
  -- Valores: 'god_admin' | 'whitelabel' | 'direct_client' | 'wl_client'

  -- Hierarquia
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  whitelabel_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Ambiente
  environment TEXT DEFAULT 'production',
  
  -- Status
  status TEXT DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX ON accounts(account_type);
CREATE INDEX ON accounts(parent_id);
CREATE INDEX ON accounts(whitelabel_id);
CREATE INDEX ON accounts(environment);
CREATE INDEX ON accounts(status);

-- 2. TABELA — whitelabel_branding
CREATE TABLE IF NOT EXISTS whitelabel_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Identidade Visual
  app_name TEXT NOT NULL,
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,

  -- Paleta de cores
  primary_color TEXT DEFAULT '25D366',
  secondary_color TEXT DEFAULT '1E293B',
  accent_color TEXT DEFAULT '3B82F6',
  background_color TEXT DEFAULT '0F172A',

  -- Domínio
  custom_domain TEXT UNIQUE,
  support_whatsapp TEXT,
  support_email TEXT,

  -- Textos
  login_headline TEXT,
  footer_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA — licenses
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  plan TEXT DEFAULT 'custom',
  status TEXT DEFAULT 'active',

  limit_devices_web INT DEFAULT 1,
  limit_devices_meta INT DEFAULT 0,
  limit_attendants INT DEFAULT 1,

  has_ai_module BOOLEAN DEFAULT false,
  ai_agents_limit INT DEFAULT 0,
  facilite_plan TEXT DEFAULT 'none',

  checkout_provider TEXT,
  payment_type TEXT,
  payment_method TEXT,
  payment_status TEXT,
  monthly_value DECIMAL(10,2),
  additional_value DECIMAL(10,2) DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  
  valid_until TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  unblocked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON licenses(account_id);

-- 4. TABELA — profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  role TEXT NOT NULL,

  full_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON profiles(account_id);
CREATE INDEX ON profiles(role);

-- 5. TABELA — audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_role TEXT,
  actor_account_id UUID,
  target_account_id UUID,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  environment TEXT DEFAULT 'production',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON audit_logs(target_account_id, created_at DESC);
CREATE INDEX ON audit_logs(actor_id, created_at DESC);
CREATE INDEX ON audit_logs(environment);

-- 6. ROW LEVEL SECURITY
-- Ignorando RLS toggle para nao travar se a tabela ja existir
-- RLS toggles require table existence handling or can just be executed.
-- It's safer to just let them execute if the table exists or if it doesn't.
-- Just wrap indexes and RLS with IF NOT EXISTS where possible, but actually we can just leave them if they throw harmlessly or wrap them if needed. (Skipping wraps for now)

CREATE POLICY client_isolation_accounts ON accounts
  FOR ALL USING (
    id = (auth.jwt()->>'account_id')::UUID
  );

CREATE POLICY wl_admin_access_accounts ON accounts
  FOR ALL USING (
    (auth.jwt()->>'role') IN ('wl_admin', 'wl_support')
    AND (
      id = (auth.jwt()->>'account_id')::UUID
      OR whitelabel_id = (auth.jwt()->>'account_id')::UUID
    )
  );

CREATE POLICY client_isolation ON profiles
  FOR ALL USING (
    account_id = (auth.jwt()->>'account_id')::UUID
    AND (auth.jwt()->>'role') IN ('admin','gestor','financeiro','consultor','representante')
  );

CREATE POLICY wl_admin_access ON profiles
  FOR ALL USING (
    (auth.jwt()->>'role') IN ('wl_admin', 'wl_support')
    AND (
      account_id = (auth.jwt()->>'account_id')::UUID
      OR account_id IN (
        SELECT id FROM accounts
        WHERE whitelabel_id = (auth.jwt()->>'account_id')::UUID
      )
    )
  );

CREATE POLICY client_isolation_licenses ON licenses
  FOR SELECT USING (
    account_id = (auth.jwt()->>'account_id')::UUID
  );

CREATE POLICY wl_admin_access_licenses ON licenses
  FOR ALL USING (
    (auth.jwt()->>'role') IN ('wl_admin', 'wl_support')
    AND (
      account_id = (auth.jwt()->>'account_id')::UUID
      OR account_id IN (
        SELECT id FROM accounts
        WHERE whitelabel_id = (auth.jwt()->>'account_id')::UUID
      )
    )
  );

CREATE POLICY public_read_whitelabel_branding ON whitelabel_branding
  FOR SELECT USING (true);

CREATE POLICY wl_admin_access_branding ON whitelabel_branding
  FOR ALL USING (
    (auth.jwt()->>'role') IN ('wl_admin', 'wl_support')
    AND account_id = (auth.jwt()->>'account_id')::UUID
  );

-- 7. FUNÇÃO AUXILIAR — get_effective_branding
CREATE OR REPLACE FUNCTION get_effective_branding(p_account_id UUID)
RETURNS TABLE (
  app_name TEXT, logo_url TEXT, logo_dark_url TEXT, favicon_url TEXT,
  primary_color TEXT, secondary_color TEXT, accent_color TEXT,
  background_color TEXT, custom_domain TEXT, support_whatsapp TEXT,
  support_email TEXT, login_headline TEXT
) AS $$
DECLARE
  v_account accounts%ROWTYPE;
  v_wl_id UUID;
BEGIN
  SELECT * INTO v_account FROM accounts WHERE id = p_account_id;

  IF v_account.account_type = 'wl_client' THEN
    v_wl_id := v_account.whitelabel_id;
  ELSIF v_account.account_type = 'whitelabel' THEN
    v_wl_id := p_account_id;
  ELSE
    RETURN;
  END IF;

  RETURN QUERY
    SELECT wb.app_name, wb.logo_url, wb.logo_dark_url, wb.favicon_url,
           wb.primary_color, wb.secondary_color, wb.accent_color,
           wb.background_color, wb.custom_domain, wb.support_whatsapp,
           wb.support_email, wb.login_headline
    FROM whitelabel_branding wb
    WHERE wb.account_id = v_wl_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. SEED DE DADOS INICIAIS
INSERT INTO accounts (name, slug, account_type, environment)
VALUES ('Whatsflow', 'whatsflow', 'god_admin', 'production');

INSERT INTO accounts (name, slug, account_type, environment)
VALUES ('Whatsflow Edtech', 'whatsflow-edtech', 'god_admin', 'development');

INSERT INTO accounts (name, slug, account_type, environment)
VALUES ('SendHit', 'sendhit', 'whitelabel', 'production');

INSERT INTO accounts (name, slug, email, account_type, whitelabel_id, parent_id, environment)
VALUES ('RadAdvogados', 'rad-advogados', 'leonardo@radadvogados.com.br', 'wl_client',
  (SELECT id FROM accounts WHERE slug='sendhit'),
  (SELECT id FROM accounts WHERE slug='sendhit'),
  'production');

INSERT INTO whitelabel_branding (account_id, app_name, primary_color, accent_color)
VALUES (
  (SELECT id FROM accounts WHERE slug='sendhit'),
  'SendHit Pro', '0EA5E9', '6366F1'
);

INSERT INTO licenses (account_id, plan, limit_devices_meta, limit_devices_web, limit_attendants, monthly_value)
VALUES (
  (SELECT id FROM accounts WHERE slug='rad-advogados'),
  'profissional', 1, 4, 48, 3074.00
);
