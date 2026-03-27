-- ═══════════════════════════════════════════════════════════════════
-- Compliance P0 + P1 Fixes — Idempotent Security Migration
--
-- P0: Strict tenant isolation, FK cascades, remove unsafe defaults
-- P1: TEXT→UUID tenant_id conversions, add tenant_id to WA tables
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- P0-1: DROP all USING(true) policies and replace with strict
--       tenant isolation on 7 tables
-- ═══════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------
-- P0-1a: Tables that already HAVE tenant_id
-- ---------------------------------------------------------------

-- financial_entries
DO $$ BEGIN
  -- Drop all existing USING(true) policies
  DROP POLICY IF EXISTS "Allow public select on financial_entries" ON public.financial_entries;
  DROP POLICY IF EXISTS "Allow public insert on financial_entries" ON public.financial_entries;
  DROP POLICY IF EXISTS "Allow public update on financial_entries" ON public.financial_entries;
  DROP POLICY IF EXISTS "Allow public delete on financial_entries" ON public.financial_entries;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.financial_entries;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_financial_entries" ON public.financial_entries;
  CREATE POLICY "Strict_Tenant_Isolation_financial_entries" ON public.financial_entries
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'financial_entries policy: %', SQLERRM;
END $$;

-- customers
DO $$ BEGIN
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'customers add tenant_id: %', SQLERRM;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all access to customers" ON public.customers;
  DROP POLICY IF EXISTS "Allow public select on customers" ON public.customers;
  DROP POLICY IF EXISTS "Allow public insert on customers" ON public.customers;
  DROP POLICY IF EXISTS "Allow public update on customers" ON public.customers;
  DROP POLICY IF EXISTS "Allow public delete on customers" ON public.customers;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.customers;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_customers" ON public.customers;
  CREATE POLICY "Strict_Tenant_Isolation_customers" ON public.customers
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'customers policy: %', SQLERRM;
END $$;

-- web_scraps
DO $$ BEGIN
  ALTER TABLE public.web_scraps ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'web_scraps add tenant_id: %', SQLERRM;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public select on web_scraps" ON public.web_scraps;
  DROP POLICY IF EXISTS "Allow public insert on web_scraps" ON public.web_scraps;
  DROP POLICY IF EXISTS "Allow public update on web_scraps" ON public.web_scraps;
  DROP POLICY IF EXISTS "Allow public delete on web_scraps" ON public.web_scraps;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.web_scraps;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_web_scraps" ON public.web_scraps;
  CREATE POLICY "Strict_Tenant_Isolation_web_scraps" ON public.web_scraps
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'web_scraps policy: %', SQLERRM;
END $$;

-- profiles_analysis
DO $$ BEGIN
  ALTER TABLE public.profiles_analysis ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'profiles_analysis add tenant_id: %', SQLERRM;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public select on profiles_analysis" ON public.profiles_analysis;
  DROP POLICY IF EXISTS "Allow public insert on profiles_analysis" ON public.profiles_analysis;
  DROP POLICY IF EXISTS "Allow public update on profiles_analysis" ON public.profiles_analysis;
  DROP POLICY IF EXISTS "Allow public delete on profiles_analysis" ON public.profiles_analysis;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.profiles_analysis;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_profiles_analysis" ON public.profiles_analysis;
  CREATE POLICY "Strict_Tenant_Isolation_profiles_analysis" ON public.profiles_analysis
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'profiles_analysis policy: %', SQLERRM;
END $$;

-- business_leads
DO $$ BEGIN
  ALTER TABLE public.business_leads ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'business_leads add tenant_id: %', SQLERRM;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public select on business_leads" ON public.business_leads;
  DROP POLICY IF EXISTS "Allow public insert on business_leads" ON public.business_leads;
  DROP POLICY IF EXISTS "Allow public update on business_leads" ON public.business_leads;
  DROP POLICY IF EXISTS "Allow public delete on business_leads" ON public.business_leads;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.business_leads;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_business_leads" ON public.business_leads;
  CREATE POLICY "Strict_Tenant_Isolation_business_leads" ON public.business_leads
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'business_leads policy: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------
-- P0-1b: Tables WITHOUT tenant_id — ADD column first
-- ---------------------------------------------------------------

-- digital_analyses
DO $$ BEGIN
  ALTER TABLE public.digital_analyses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'digital_analyses add tenant_id: %', SQLERRM;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public select on digital_analyses" ON public.digital_analyses;
  DROP POLICY IF EXISTS "Allow public insert on digital_analyses" ON public.digital_analyses;
  DROP POLICY IF EXISTS "Allow public update on digital_analyses" ON public.digital_analyses;
  DROP POLICY IF EXISTS "Allow public delete on digital_analyses" ON public.digital_analyses;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.digital_analyses;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_digital_analyses" ON public.digital_analyses;
  CREATE POLICY "Strict_Tenant_Isolation_digital_analyses" ON public.digital_analyses
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'digital_analyses policy: %', SQLERRM;
END $$;

-- export_logs
DO $$ BEGIN
  ALTER TABLE public.export_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'export_logs add tenant_id: %', SQLERRM;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public select on export_logs" ON public.export_logs;
  DROP POLICY IF EXISTS "Allow public insert on export_logs" ON public.export_logs;
  DROP POLICY IF EXISTS "Allow public update on export_logs" ON public.export_logs;
  DROP POLICY IF EXISTS "Allow public delete on export_logs" ON public.export_logs;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.export_logs;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_export_logs" ON public.export_logs;
  CREATE POLICY "Strict_Tenant_Isolation_export_logs" ON public.export_logs
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'export_logs policy: %', SQLERRM;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- P0-2: Add ON DELETE CASCADE to FKs
-- ═══════════════════════════════════════════════════════════════════

-- payment_dunnings (tenant_id → tenants)
ALTER TABLE public.payment_dunnings
  DROP CONSTRAINT IF EXISTS payment_dunnings_tenant_id_fkey;
ALTER TABLE public.payment_dunnings
  ADD CONSTRAINT payment_dunnings_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- tasks (tenant_id → tenants)
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_tenant_id_fkey;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- meta_connections: convert TEXT tenant_id → UUID, then add FK with CASCADE
DO $$ BEGIN
  -- Check if column is TEXT and convert to UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meta_connections'
      AND column_name = 'tenant_id'
      AND data_type IN ('text', 'character varying')
  ) THEN
    -- Remove old default
    ALTER TABLE public.meta_connections ALTER COLUMN tenant_id DROP DEFAULT;
    -- Convert TEXT → UUID
    ALTER TABLE public.meta_connections
      ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
  END IF;
END $$;

ALTER TABLE public.meta_connections
  DROP CONSTRAINT IF EXISTS meta_connections_tenant_id_fkey;
ALTER TABLE public.meta_connections
  ADD CONSTRAINT meta_connections_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Also fix USING(true) policies on meta_connections
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view meta connections" ON public.meta_connections;
  DROP POLICY IF EXISTS "Users can insert meta connections" ON public.meta_connections;
  DROP POLICY IF EXISTS "Users can update meta connections" ON public.meta_connections;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.meta_connections;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_meta_connections" ON public.meta_connections;
  CREATE POLICY "Strict_Tenant_Isolation_meta_connections" ON public.meta_connections
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'meta_connections policy: %', SQLERRM;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- P0-3: Remove DEFAULT '00000000-...-000001' from tenant_id
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.prospect_campaigns ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.negocios            ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.whatsapp_instances  ALTER COLUMN tenant_id DROP DEFAULT;


-- ═══════════════════════════════════════════════════════════════════
-- P1-4: Convert TEXT tenant_id → UUID
-- ═══════════════════════════════════════════════════════════════════

-- sales_pipelines
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_pipelines'
      AND column_name = 'tenant_id' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE public.sales_pipelines ALTER COLUMN tenant_id DROP DEFAULT;
    ALTER TABLE public.sales_pipelines
      ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
    -- Re-apply FK with CASCADE
    ALTER TABLE public.sales_pipelines
      DROP CONSTRAINT IF EXISTS sales_pipelines_tenant_id_fkey;
    ALTER TABLE public.sales_pipelines
      ADD CONSTRAINT sales_pipelines_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- manual_articles
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'manual_articles'
      AND column_name = 'tenant_id' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE public.manual_articles ALTER COLUMN tenant_id DROP DEFAULT;
    ALTER TABLE public.manual_articles
      ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
    ALTER TABLE public.manual_articles
      DROP CONSTRAINT IF EXISTS manual_articles_tenant_id_fkey;
    ALTER TABLE public.manual_articles
      ADD CONSTRAINT manual_articles_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- tutorials
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tutorials'
      AND column_name = 'tenant_id' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE public.tutorials ALTER COLUMN tenant_id DROP DEFAULT;
    ALTER TABLE public.tutorials
      ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
    ALTER TABLE public.tutorials
      DROP CONSTRAINT IF EXISTS tutorials_tenant_id_fkey;
    ALTER TABLE public.tutorials
      ADD CONSTRAINT tutorials_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop stale USING(true) policies on these TEXT→UUID tables and re-create strict
DO $$ BEGIN
  -- sales_pipelines
  DROP POLICY IF EXISTS "Users can view pipelines" ON public.sales_pipelines;
  DROP POLICY IF EXISTS "Users can insert pipelines" ON public.sales_pipelines;
  DROP POLICY IF EXISTS "Users can update pipelines" ON public.sales_pipelines;
  DROP POLICY IF EXISTS "Users can delete pipelines" ON public.sales_pipelines;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.sales_pipelines;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_sales_pipelines" ON public.sales_pipelines;
  CREATE POLICY "Strict_Tenant_Isolation_sales_pipelines" ON public.sales_pipelines
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

  -- manual_articles
  DROP POLICY IF EXISTS "Authenticated users can read published articles" ON public.manual_articles;
  DROP POLICY IF EXISTS "Admins can manage articles" ON public.manual_articles;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.manual_articles;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_manual_articles" ON public.manual_articles;
  CREATE POLICY "Strict_Tenant_Isolation_manual_articles" ON public.manual_articles
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

  -- tutorials
  DROP POLICY IF EXISTS "Authenticated users can read published tutorials" ON public.tutorials;
  DROP POLICY IF EXISTS "Admins can manage tutorials" ON public.tutorials;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.tutorials;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_tutorials" ON public.tutorials;
  CREATE POLICY "Strict_Tenant_Isolation_tutorials" ON public.tutorials
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'P1-4 policies: %', SQLERRM;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- P1-5: Add tenant_id to whatsapp_campaigns, whatsapp_contacts,
--       whatsapp_leads and populate from whatsapp_instances
-- ═══════════════════════════════════════════════════════════════════

-- Add columns
ALTER TABLE public.whatsapp_campaigns
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_leads
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Populate tenant_id from whatsapp_instances via instance_name
UPDATE public.whatsapp_campaigns wc
SET tenant_id = (
  SELECT wi.tenant_id FROM public.whatsapp_instances wi
  WHERE wi.instance_name = wc.instance_name
  LIMIT 1
)
WHERE wc.tenant_id IS NULL;

UPDATE public.whatsapp_contacts wc
SET tenant_id = (
  SELECT wi.tenant_id FROM public.whatsapp_instances wi
  WHERE wi.instance_name = wc.instance_name
  LIMIT 1
)
WHERE wc.tenant_id IS NULL;

UPDATE public.whatsapp_leads wl
SET tenant_id = (
  SELECT wi.tenant_id FROM public.whatsapp_instances wi
  WHERE wi.instance_name = wl.instance_name
  LIMIT 1
)
WHERE wl.tenant_id IS NULL;

-- Replace open policies with strict tenant isolation
DO $$ BEGIN
  -- whatsapp_campaigns
  DROP POLICY IF EXISTS "Allow public access on whatsapp_campaigns" ON public.whatsapp_campaigns;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.whatsapp_campaigns;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_whatsapp_campaigns" ON public.whatsapp_campaigns;
  CREATE POLICY "Strict_Tenant_Isolation_whatsapp_campaigns" ON public.whatsapp_campaigns
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

  -- whatsapp_contacts
  DROP POLICY IF EXISTS "Allow public access on whatsapp_contacts" ON public.whatsapp_contacts;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.whatsapp_contacts;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_whatsapp_contacts" ON public.whatsapp_contacts;
  CREATE POLICY "Strict_Tenant_Isolation_whatsapp_contacts" ON public.whatsapp_contacts
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

  -- whatsapp_leads
  DROP POLICY IF EXISTS "Allow public access on whatsapp_leads" ON public.whatsapp_leads;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.whatsapp_leads;
  DROP POLICY IF EXISTS "Strict_Tenant_Isolation_whatsapp_leads" ON public.whatsapp_leads;
  CREATE POLICY "Strict_Tenant_Isolation_whatsapp_leads" ON public.whatsapp_leads
    FOR ALL TO authenticated
    USING  (tenant_id IN (SELECT get_my_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'P1-5 policies: %', SQLERRM;
END $$;

-- Create indexes for the new tenant_id columns (performance)
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_tenant ON public.whatsapp_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant ON public.whatsapp_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_tenant ON public.whatsapp_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_digital_analyses_tenant ON public.digital_analyses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_tenant ON public.export_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_web_scraps_tenant ON public.web_scraps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_analysis_tenant ON public.profiles_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_business_leads_tenant ON public.business_leads(tenant_id);

COMMIT;
