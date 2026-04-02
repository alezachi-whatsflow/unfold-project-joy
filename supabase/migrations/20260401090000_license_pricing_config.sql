-- Add pricing_config JSONB to licenses table
-- Nexus admin sets these values when creating/editing a license
-- Client's Assinatura page reads from here
-- Prices use tier system (quantity ranges)
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT '{
  "device_web_tiers": [
    {"min": 1, "max": 5, "price": 150},
    {"min": 6, "max": 20, "price": 125},
    {"min": 21, "max": 50, "price": 100}
  ],
  "device_meta_tiers": [
    {"min": 1, "max": 5, "price": 100},
    {"min": 6, "max": 20, "price": 70},
    {"min": 21, "max": 50, "price": 50}
  ],
  "attendant_tiers": [
    {"min": 1, "max": 5, "price": 80},
    {"min": 6, "max": 10, "price": 75},
    {"min": 11, "max": 20, "price": 70},
    {"min": 21, "max": 50, "price": 60}
  ],
  "ai_module_price": 350,
  "facilite_basico_price": 250,
  "facilite_intermediario_price": 700,
  "facilite_avancado_price": 1500,
  "implantacao_price": 2000
}'::jsonb;

COMMENT ON COLUMN public.licenses.pricing_config IS 'Tiered unit prices for add-ons. Set by Nexus admin. Read by client Assinatura page.';
