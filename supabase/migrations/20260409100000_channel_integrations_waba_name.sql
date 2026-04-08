-- Add waba_name column to channel_integrations
ALTER TABLE channel_integrations ADD COLUMN IF NOT EXISTS waba_name TEXT;
