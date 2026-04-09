-- Auto-create virtual whatsapp_instances for all WABA Cloud API integrations
-- This ensures RLS (Instance_Tenant_Isolation) passes for cloud_api_ instance names

INSERT INTO whatsapp_instances (instance_name, session_id, tenant_id, status, provedor, label)
SELECT
  'cloud_api_' || ci.phone_number_id,
  'cloud_api_' || ci.phone_number_id,
  ci.tenant_id,
  'connected',
  'cloud_api',
  COALESCE(ci.name, 'WhatsApp Cloud API')
FROM channel_integrations ci
WHERE ci.provider = 'WABA'
  AND ci.phone_number_id IS NOT NULL
  AND ci.status = 'active'
ON CONFLICT (session_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  status = 'connected',
  label = EXCLUDED.label;

-- Same for Instagram integrations
INSERT INTO whatsapp_instances (instance_name, session_id, tenant_id, status, provedor, label)
SELECT
  'instagram_' || ci.facebook_page_id,
  'instagram_' || ci.facebook_page_id,
  ci.tenant_id,
  'connected',
  'instagram',
  COALESCE(ci.name, 'Instagram')
FROM channel_integrations ci
WHERE ci.provider = 'INSTAGRAM'
  AND ci.facebook_page_id IS NOT NULL
  AND ci.status = 'active'
ON CONFLICT (session_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  status = 'connected',
  label = EXCLUDED.label;

-- Same for Messenger integrations
INSERT INTO whatsapp_instances (instance_name, session_id, tenant_id, status, provedor, label)
SELECT
  'messenger_' || ci.facebook_page_id,
  'messenger_' || ci.facebook_page_id,
  ci.tenant_id,
  'connected',
  'messenger',
  COALESCE(ci.name, 'Messenger')
FROM channel_integrations ci
WHERE ci.provider = 'MESSENGER'
  AND ci.facebook_page_id IS NOT NULL
  AND ci.status = 'active'
ON CONFLICT (session_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  status = 'connected',
  label = EXCLUDED.label;

-- Same for Telegram integrations
INSERT INTO whatsapp_instances (instance_name, session_id, tenant_id, status, provedor, label)
SELECT
  'telegram_' || COALESCE(ci.bot_username, ci.id::text),
  'telegram_' || COALESCE(ci.bot_username, ci.id::text),
  ci.tenant_id,
  'connected',
  'telegram',
  COALESCE(ci.name, 'Telegram')
FROM channel_integrations ci
WHERE ci.provider = 'TELEGRAM'
  AND ci.status = 'active'
ON CONFLICT (session_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  status = 'connected',
  label = EXCLUDED.label;
