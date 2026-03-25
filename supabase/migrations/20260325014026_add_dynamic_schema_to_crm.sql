-- ═══════════════════════════════════════════════════════════════
-- Metadata-Driven UI — Dynamic CRM Fields via JSONB
-- Allows tenants to have custom fields per pipeline/niche
-- ═══════════════════════════════════════════════════════════════

-- 1. card_schema on sales_pipelines: defines which custom fields each pipeline expects
ALTER TABLE public.sales_pipelines
  ADD COLUMN IF NOT EXISTS card_schema JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.sales_pipelines.card_schema IS
  'Array of field definitions: [{key, label, type, options?, required}]. Drives dynamic UI rendering in NegocioDrawer.';

-- 2. custom_fields on negocios: stores the actual values per deal
ALTER TABLE public.negocios
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.negocios.custom_fields IS
  'Key-value map matching card_schema keys. Example: {"ticket_medio": 150, "origem_trafego": "Google Ads"}';

-- 3. GIN indexes for performant JSONB queries (containment, key-exists)
CREATE INDEX IF NOT EXISTS idx_pipelines_card_schema ON public.sales_pipelines USING GIN (card_schema);
CREATE INDEX IF NOT EXISTS idx_negocios_custom_fields ON public.negocios USING GIN (custom_fields);
