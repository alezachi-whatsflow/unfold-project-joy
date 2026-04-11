-- ══════════════════════════════════════════════════════════════
-- Whatsflow Partner Brand Configuration
-- Populates whitelabel_config + whitelabel_branding for the
-- Whatsflow partner with official brand guideline colors.
-- ══════════════════════════════════════════════════════════════

-- 1. Update whitelabel_config for Whatsflow (by slug pattern)
UPDATE whitelabel_config
SET
  display_name = 'Whatsflow',
  primary_color = '#11BC76',
  updated_at = now()
WHERE slug LIKE '%whatsflow%' OR slug LIKE '%zachi%';

-- 2. Upsert whitelabel_branding with full brand palette
-- (Uses account_id = license_id from whitelabel_config)
INSERT INTO whitelabel_branding (
  account_id, app_name,
  primary_color, secondary_color, accent_color, background_color,
  support_whatsapp, support_email,
  login_headline, footer_text
)
SELECT
  wc.license_id,
  'Whatsflow',
  '11BC76',    -- Verde Esmeralda (primary)
  '191D20',    -- Preto Eclipse (secondary)
  '4F5AE3',    -- Azul Elétrico (accent)
  '191D20',    -- Preto Eclipse (background)
  wc.support_whatsapp,
  wc.support_email,
  'Onde conversas viram conversões',
  '© Whatsflow — Powered by IAZIS'
FROM whitelabel_config wc
WHERE wc.slug LIKE '%whatsflow%' OR wc.slug LIKE '%zachi%'
ON CONFLICT (account_id) DO UPDATE SET
  app_name = 'Whatsflow',
  primary_color = '11BC76',
  secondary_color = '191D20',
  accent_color = '4F5AE3',
  background_color = '191D20',
  login_headline = 'Onde conversas viram conversões',
  footer_text = '© Whatsflow — Powered by IAZIS',
  updated_at = now();
