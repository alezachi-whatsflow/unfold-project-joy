-- ═══════════════════════════════════════════════════════════════
-- Mercado Livre Integration — OAuth + Messaging + Questions
-- Provider: 'MERCADOLIVRE' in channel_integrations
-- ═══════════════════════════════════════════════════════════════

-- 1. Add ML-specific columns to channel_integrations
ALTER TABLE channel_integrations
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ml_user_id TEXT,
  ADD COLUMN IF NOT EXISTS ml_app_id TEXT,
  ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT '{}';

-- Index for ML user lookup (webhook resolves tenant by ml_user_id)
CREATE INDEX IF NOT EXISTS idx_channel_ml_user
  ON channel_integrations(ml_user_id) WHERE ml_user_id IS NOT NULL;