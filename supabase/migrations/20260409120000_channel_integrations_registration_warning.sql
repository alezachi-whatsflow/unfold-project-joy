-- Add registration_warning column to channel_integrations
ALTER TABLE channel_integrations ADD COLUMN IF NOT EXISTS registration_warning TEXT;
