-- Expand provider CHECK constraint to support all 7 channels
ALTER TABLE public.channel_integrations DROP CONSTRAINT IF EXISTS channel_integrations_provider_check;
ALTER TABLE public.channel_integrations ADD CONSTRAINT channel_integrations_provider_check
  CHECK (provider IN ('WABA', 'INSTAGRAM', 'TELEGRAM', 'MERCADOLIVRE', 'WEBCHAT', 'FACEBOOK', 'MESSENGER'));

ALTER TABLE public.oauth_states DROP CONSTRAINT IF EXISTS oauth_states_provider_check;
ALTER TABLE public.oauth_states ADD CONSTRAINT oauth_states_provider_check
  CHECK (provider IN ('WABA', 'INSTAGRAM', 'TELEGRAM', 'MERCADOLIVRE', 'WEBCHAT', 'FACEBOOK', 'MESSENGER'));
