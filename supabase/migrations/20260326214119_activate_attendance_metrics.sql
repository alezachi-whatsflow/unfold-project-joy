-- ═══════════════════════════════════════════════════════════════
-- Activate Attendance Metrics — CSAT + Conversation tracking
-- ═══════════════════════════════════════════════════════════════

-- 1. CSAT (Customer Satisfaction) ratings
CREATE TABLE IF NOT EXISTS public.csat_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  contact_phone TEXT,
  contact_name TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  channel TEXT DEFAULT 'whatsapp',
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_csat_tenant ON csat_ratings(tenant_id);
CREATE INDEX idx_csat_date ON csat_ratings(tenant_id, created_at);

ALTER TABLE csat_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict_Tenant_Isolation" ON csat_ratings FOR ALL
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON csat_ratings TO anon, authenticated;

-- 2. Ensure conversations has all tracking fields
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS csat_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS csat_rating INTEGER;

-- 3. Ensure whatsapp_messages has sender tracking for agent metrics
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID;

-- 4. Enable realtime on CSAT
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE csat_ratings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;