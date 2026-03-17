
-- Nexus internal team users
CREATE TABLE public.nexus_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  role          TEXT NOT NULL DEFAULT 'nexus_suporte_junior',
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  created_by    UUID REFERENCES public.nexus_users(id)
);

-- License usage metrics per period
CREATE TABLE public.nexus_license_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id      UUID NOT NULL,
  period_month    DATE NOT NULL,
  messages_sent   BIGINT DEFAULT 0,
  storage_used_gb NUMERIC(6,2) DEFAULT 0,
  active_devices  INTEGER DEFAULT 0,
  active_attendants INTEGER DEFAULT 0,
  recorded_at     TIMESTAMPTZ DEFAULT now()
);

-- Nexus audit logs (all team actions)
CREATE TABLE public.nexus_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES public.nexus_users(id),
  actor_role    TEXT NOT NULL,
  action        TEXT NOT NULL,
  license_id    UUID,
  target_entity TEXT,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    TEXT,
  session_id    TEXT,
  justification TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Feature flags
CREATE TABLE public.nexus_feature_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key      TEXT UNIQUE NOT NULL,
  description   TEXT,
  is_global     BOOLEAN DEFAULT false,
  default_value BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Feature flags per license
CREATE TABLE public.nexus_license_feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id  UUID NOT NULL,
  flag_key    TEXT NOT NULL REFERENCES public.nexus_feature_flags(flag_key),
  value       BOOLEAN NOT NULL,
  updated_by  UUID REFERENCES public.nexus_users(id),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (license_id, flag_key)
);

-- Internal tickets
CREATE TABLE public.nexus_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id    UUID,
  created_by    UUID REFERENCES public.nexus_users(id),
  assigned_to   UUID REFERENCES public.nexus_users(id),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'aberto',
  priority      TEXT DEFAULT 'normal',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Add columns to existing licenses table for Nexus fields
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS license_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS customer_success_id UUID REFERENCES public.nexus_users(id);
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS monthly_messages_limit BIGINT DEFAULT 10000;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS storage_limit_gb NUMERIC(6,2) DEFAULT 1.0;

-- Enable RLS on all nexus tables
ALTER TABLE public.nexus_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_license_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_license_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_tickets ENABLE ROW LEVEL SECURITY;

-- RLS: Nexus users can access if they are authenticated and exist in nexus_users
CREATE OR REPLACE FUNCTION public.is_nexus_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nexus_users 
    WHERE auth_user_id = auth.uid() AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_nexus_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.nexus_users 
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- nexus_users policies
CREATE POLICY "Nexus users can view all nexus users"
ON public.nexus_users FOR SELECT TO authenticated
USING (public.is_nexus_user());

CREATE POLICY "Superadmin can manage nexus users"
ON public.nexus_users FOR ALL TO authenticated
USING (public.get_nexus_role() = 'nexus_superadmin')
WITH CHECK (public.get_nexus_role() = 'nexus_superadmin');

-- nexus_audit_logs policies
CREATE POLICY "Nexus users can view audit logs"
ON public.nexus_audit_logs FOR SELECT TO authenticated
USING (public.is_nexus_user());

CREATE POLICY "Nexus users can insert audit logs"
ON public.nexus_audit_logs FOR INSERT TO authenticated
WITH CHECK (public.is_nexus_user());

-- nexus_license_usage policies
CREATE POLICY "Nexus users can view license usage"
ON public.nexus_license_usage FOR SELECT TO authenticated
USING (public.is_nexus_user());

CREATE POLICY "Nexus users can manage license usage"
ON public.nexus_license_usage FOR ALL TO authenticated
USING (public.get_nexus_role() IN ('nexus_superadmin', 'nexus_dev_senior'))
WITH CHECK (public.get_nexus_role() IN ('nexus_superadmin', 'nexus_dev_senior'));

-- nexus_feature_flags policies
CREATE POLICY "Nexus users can view feature flags"
ON public.nexus_feature_flags FOR SELECT TO authenticated
USING (public.is_nexus_user());

CREATE POLICY "Admins can manage feature flags"
ON public.nexus_feature_flags FOR ALL TO authenticated
USING (public.get_nexus_role() IN ('nexus_superadmin', 'nexus_dev_senior'))
WITH CHECK (public.get_nexus_role() IN ('nexus_superadmin', 'nexus_dev_senior'));

-- nexus_license_feature_flags policies
CREATE POLICY "Nexus users can view license feature flags"
ON public.nexus_license_feature_flags FOR SELECT TO authenticated
USING (public.is_nexus_user());

CREATE POLICY "Admins can manage license feature flags"
ON public.nexus_license_feature_flags FOR ALL TO authenticated
USING (public.get_nexus_role() IN ('nexus_superadmin', 'nexus_dev_senior'))
WITH CHECK (public.get_nexus_role() IN ('nexus_superadmin', 'nexus_dev_senior'));

-- nexus_tickets policies
CREATE POLICY "Nexus users can view tickets"
ON public.nexus_tickets FOR SELECT TO authenticated
USING (public.is_nexus_user());

CREATE POLICY "Nexus users can create tickets"
ON public.nexus_tickets FOR INSERT TO authenticated
WITH CHECK (public.is_nexus_user());

CREATE POLICY "Nexus users can update tickets"
ON public.nexus_tickets FOR UPDATE TO authenticated
USING (public.is_nexus_user());
