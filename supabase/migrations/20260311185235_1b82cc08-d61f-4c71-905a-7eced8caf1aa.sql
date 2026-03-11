
-- ============================================================
-- FASE 1: INFRAESTRUTURA DE ISOLAMENTO POR TENANT
-- ============================================================

-- 1. Tabela user_tenants: vincula usuários a tenants
CREATE TABLE IF NOT EXISTS public.user_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- RLS: usuários vêem suas próprias associações; admins vêem tudo
CREATE POLICY "Users can view own tenant links"
  ON public.user_tenants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'gestor'));

CREATE POLICY "Admins can insert tenant links"
  ON public.user_tenants FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'gestor'));

CREATE POLICY "Admins can update tenant links"
  ON public.user_tenants FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'gestor'));

CREATE POLICY "Admins can delete tenant links"
  ON public.user_tenants FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin', 'gestor'));

-- 2. Função SECURITY DEFINER para obter tenant_ids do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
$$;

-- 3. Auto-populate: quando um novo usuário é criado, vinculá-lo ao tenant padrão
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  default_tenant uuid;
BEGIN
  SELECT id INTO default_tenant FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  IF default_tenant IS NOT NULL THEN
    INSERT INTO public.user_tenants (user_id, tenant_id, is_owner)
    VALUES (NEW.id, default_tenant, false)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tenant();

-- 4. Populate para usuários existentes (vincular ao primeiro tenant)
INSERT INTO public.user_tenants (user_id, tenant_id, is_owner)
SELECT u.id, t.id, false
FROM auth.users u
CROSS JOIN (SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1) t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = u.id AND ut.tenant_id = t.id
)
ON CONFLICT DO NOTHING;
