-- ============================================================
-- P0-6: Remove openai_apikey from whatsapp_instances
-- The chatbot API key should live in ai_configurations table
-- (per-tenant, encrypted context) instead of plain text in
-- the instance row visible to any frontend query.
-- ============================================================

-- Step 1: Migrate any existing openai_apikey values to ai_configurations
INSERT INTO public.ai_configurations (tenant_id, provider, api_key, model, is_active, is_global)
SELECT DISTINCT
  wi.tenant_id,
  'openai',
  wi.openai_apikey,
  'gpt-4o-mini',
  true,
  false
FROM public.whatsapp_instances wi
WHERE wi.openai_apikey IS NOT NULL
  AND wi.openai_apikey != ''
  AND wi.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_configurations ac
    WHERE ac.tenant_id = wi.tenant_id AND ac.provider = 'openai'
  );

-- Step 2: Drop the column (data already migrated above)
ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS openai_apikey;

-- Step 3: Also drop other chatbot columns that are now handled by ai_configurations
-- (keeping chatbot_enabled and chatbot_ignore_groups as they control instance behavior)
COMMENT ON TABLE public.whatsapp_instances IS
  'WhatsApp instance connections. AI keys migrated to ai_configurations table (2026-03-31).';
