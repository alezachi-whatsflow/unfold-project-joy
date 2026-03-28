-- Add analytics columns to whatsapp_leads (our session/ticket table)
ALTER TABLE public.whatsapp_leads
  ADD COLUMN IF NOT EXISTS is_resolved_first_contact BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_sentiment_score TEXT DEFAULT NULL, -- positive, neutral, negative, complaint
  ADD COLUMN IF NOT EXISTS time_to_first_yes_minutes NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS concurrent_conversations_avg NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS idle_time_minutes NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ DEFAULT NULL;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_leads_resolved_at ON whatsapp_leads(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sentiment ON whatsapp_leads(ai_sentiment_score) WHERE ai_sentiment_score IS NOT NULL;
