-- Add Google OAuth credentials per Partner (WhiteLabel)
-- Each partner configures their own Google Cloud project
ALTER TABLE whitelabel_config
  ADD COLUMN IF NOT EXISTS google_client_id text,
  ADD COLUMN IF NOT EXISTS google_client_secret text;

COMMENT ON COLUMN whitelabel_config.google_client_id IS 'Google OAuth Client ID — per partner, configured in Google Cloud Console';
COMMENT ON COLUMN whitelabel_config.google_client_secret IS 'Google OAuth Client Secret — encrypted at rest by Supabase';
