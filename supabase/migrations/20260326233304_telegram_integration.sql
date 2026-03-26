-- Telegram Bot API Integration
-- Provider: 'TELEGRAM' in channel_integrations

ALTER TABLE channel_integrations
  ADD COLUMN IF NOT EXISTS bot_token TEXT,
  ADD COLUMN IF NOT EXISTS bot_username TEXT;

CREATE INDEX IF NOT EXISTS idx_channel_bot_token
  ON channel_integrations(bot_token) WHERE bot_token IS NOT NULL;