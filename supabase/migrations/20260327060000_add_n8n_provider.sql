-- Add N8N to provider CHECK constraint
ALTER TABLE public.channel_integrations DROP CONSTRAINT IF EXISTS channel_integrations_provider_check;
ALTER TABLE public.channel_integrations ADD CONSTRAINT channel_integrations_provider_check
  CHECK (provider IN ('WABA', 'INSTAGRAM', 'TELEGRAM', 'MERCADOLIVRE', 'WEBCHAT', 'FACEBOOK', 'MESSENGER', 'N8N'));

ALTER TABLE public.oauth_states DROP CONSTRAINT IF EXISTS oauth_states_provider_check;
ALTER TABLE public.oauth_states ADD CONSTRAINT oauth_states_provider_check
  CHECK (provider IN ('WABA', 'INSTAGRAM', 'TELEGRAM', 'MERCADOLIVRE', 'WEBCHAT', 'FACEBOOK', 'MESSENGER', 'N8N'));
