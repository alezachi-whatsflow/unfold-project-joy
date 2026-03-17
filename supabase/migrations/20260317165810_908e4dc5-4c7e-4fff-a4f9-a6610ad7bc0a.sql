
-- CORREÇÃO 1: Adicionar colunas de 3 camadas à tabela licenses
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS license_type TEXT NOT NULL DEFAULT 'individual';

-- Usar validation trigger ao invés de CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_license_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.license_type NOT IN ('internal', 'whitelabel', 'individual') THEN
    RAISE EXCEPTION 'license_type must be internal, whitelabel, or individual';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_license_type
  BEFORE INSERT OR UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_license_type();

-- Hierarquia: sub-licenças pertencem a uma licença WhiteLabel pai
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS parent_license_id UUID REFERENCES public.licenses(id);

-- Flag de licença interna (isenta de cobrança e vencimento)
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- Slug do WhiteLabel
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS whitelabel_slug TEXT;

-- Criar unique index parcial (apenas quando whitelabel_slug não é null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_whitelabel_slug
  ON public.licenses(whitelabel_slug) WHERE whitelabel_slug IS NOT NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_licenses_parent ON public.licenses(parent_license_id);
CREATE INDEX IF NOT EXISTS idx_licenses_type ON public.licenses(license_type);

-- CORREÇÃO 2: Tabela whitelabel_config
CREATE TABLE IF NOT EXISTS public.whitelabel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#11BC76',
  support_email TEXT,
  support_whatsapp TEXT,
  custom_domain TEXT,
  can_create_licenses BOOLEAN DEFAULT true,
  max_sub_licenses INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whitelabel_config_license ON public.whitelabel_config(license_id);

-- RLS para whitelabel_config
ALTER TABLE public.whitelabel_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nexus users can manage whitelabel_config"
  ON public.whitelabel_config FOR ALL TO authenticated
  USING (is_nexus_user() OR (get_my_role() = ANY (ARRAY['admin'::text, 'superadmin'::text])))
  WITH CHECK (is_nexus_user() OR (get_my_role() = ANY (ARRAY['admin'::text, 'superadmin'::text])));

CREATE POLICY "WhiteLabel owners can view own config"
  ON public.whitelabel_config FOR SELECT TO authenticated
  USING (license_id IN (
    SELECT l.id FROM public.licenses l
    WHERE l.tenant_id IN (SELECT get_my_tenant_ids())
  ));

-- Adicionar license_id à profiles para vinculação direta
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.licenses(id);

CREATE INDEX IF NOT EXISTS idx_profiles_license ON public.profiles(license_id);
