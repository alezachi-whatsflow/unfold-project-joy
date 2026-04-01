-- Add pricing_config JSONB to licenses table
-- Nexus admin sets these values when creating/editing a license
-- Client's Assinatura page reads from here
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT '{
  "device_web_price": 125,
  "device_meta_price": 100,
  "attendant_price": 60,
  "ai_module_price": 350,
  "facilite_basico_price": 250,
  "facilite_intermediario_price": 700,
  "facilite_avancado_price": 1500,
  "implantacao_price": 2000
}'::jsonb;

COMMENT ON COLUMN public.licenses.pricing_config IS 'Unit prices for add-ons. Set by Nexus admin. Read by client Assinatura page.';
