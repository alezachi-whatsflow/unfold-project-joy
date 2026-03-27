-- ═══════════════════════════════════════════════════════════════
-- Webchat (Live Chat) Infrastructure
-- Public API for website widgets — anonymous visitors
-- ═══════════════════════════════════════════════════════════════

-- 1. Webchat sessions (anonymous visitors)
CREATE TABLE IF NOT EXISTS public.webchat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_metadata JSONB DEFAULT '{}',
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  status TEXT DEFAULT 'active',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, visitor_id)
);

CREATE INDEX idx_webchat_tenant ON webchat_sessions(tenant_id);
CREATE INDEX idx_webchat_status ON webchat_sessions(tenant_id, status);
CREATE INDEX idx_webchat_visitor ON webchat_sessions(tenant_id, visitor_id);

-- 2. Webchat config per tenant (widget appearance + behavior)
CREATE TABLE IF NOT EXISTS public.webchat_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  widget_color TEXT DEFAULT '#11bc76',
  widget_position TEXT DEFAULT 'bottom-right',
  welcome_message TEXT DEFAULT 'Olá! Como posso ajudar?',
  offline_message TEXT DEFAULT 'No momento estamos offline. Deixe sua mensagem!',
  ask_name BOOLEAN DEFAULT true,
  ask_email BOOLEAN DEFAULT false,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_text TEXT,
  business_hours JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add webchat_session_id to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS webchat_session_id UUID REFERENCES webchat_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_webchat ON chat_messages(webchat_session_id) WHERE webchat_session_id IS NOT NULL;

-- 4. RLS: service_role only for webchat_sessions (public API uses service key)
ALTER TABLE webchat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webchat_config ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Edge Function uses service_role)
CREATE POLICY "service_role_webchat_sessions" ON webchat_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_webchat_config" ON webchat_config FOR ALL TO service_role USING (true);

-- Authenticated users can read their tenant's sessions
CREATE POLICY "tenant_read_webchat_sessions" ON webchat_sessions FOR SELECT TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE POLICY "tenant_manage_webchat_config" ON webchat_config FOR ALL TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON webchat_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webchat_config TO anon, authenticated;

-- 5. Enable Realtime for live chat
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE webchat_sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;