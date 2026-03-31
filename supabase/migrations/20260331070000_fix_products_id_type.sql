-- ============================================================
-- Fix products.id to accept TEXT IDs from frontend
-- Frontend generates IDs like "prod_001", not UUIDs
-- ============================================================

-- Drop existing table and recreate with TEXT id
-- (table is empty so this is safe)
DROP TABLE IF EXISTS public.products CASCADE;

CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Plano Base',
  type TEXT NOT NULL DEFAULT 'recurring' CHECK (type IN ('recurring', 'one_time')),
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  cogs DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  support_cost DECIMAL(12,2) DEFAULT 0,
  sales_commission_pct DECIMAL(5,2) DEFAULT 0,
  active_customers INT DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  mrr DECIMAL(12,2) DEFAULT 0,
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

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
GRANT ALL ON public.products TO authenticated;
