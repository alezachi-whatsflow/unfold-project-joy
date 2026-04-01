-- Expand ai_configurations provider CHECK to support scraping and email providers
ALTER TABLE public.ai_configurations DROP CONSTRAINT IF EXISTS ai_configurations_provider_check;
ALTER TABLE public.ai_configurations ADD CONSTRAINT ai_configurations_provider_check
  CHECK (provider = ANY (ARRAY['openai', 'anthropic', 'gemini', 'firecrawl', 'apify', 'smtp', 'openai_crm_assistant']));
