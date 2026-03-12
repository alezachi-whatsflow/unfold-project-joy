
-- ============================================
-- PHASE 3: CRM Contacts table
-- ============================================
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  tags TEXT[] DEFAULT '{}',
  stage TEXT NOT NULL DEFAULT 'lead',
  owner_id UUID,
  source TEXT DEFAULT 'manual',
  notes TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on crm_contacts" ON public.crm_contacts
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE INDEX idx_crm_contacts_tenant ON public.crm_contacts(tenant_id);
CREATE INDEX idx_crm_contacts_phone ON public.crm_contacts(tenant_id, phone);
CREATE INDEX idx_crm_contacts_stage ON public.crm_contacts(tenant_id, stage);

-- ============================================
-- PHASE 4: Conversations + Messages tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id),
  wa_connection_id UUID,
  owner_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  channel TEXT DEFAULT 'whatsapp',
  unread_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium',
  sla_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE INDEX idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX idx_conversations_status ON public.conversations(tenant_id, status);
CREATE INDEX idx_conversations_last_msg ON public.conversations(tenant_id, last_message_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'inbound',
  content TEXT DEFAULT '',
  content_type TEXT DEFAULT 'text',
  media_url TEXT,
  status TEXT DEFAULT 'sent',
  sender_id UUID,
  wa_message_id TEXT,
  is_internal_note BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on chat_messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE INDEX idx_chat_messages_conv ON public.chat_messages(conversation_id, timestamp DESC);
CREATE INDEX idx_chat_messages_tenant ON public.chat_messages(tenant_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============================================
-- PHASE 3: WhatsApp Connections unified table
-- ============================================
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone_number TEXT,
  type TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'disconnected',
  waba_id TEXT,
  phone_number_id TEXT,
  meta_business_id TEXT,
  quality_rating TEXT,
  webhook_verify_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on whatsapp_connections" ON public.whatsapp_connections
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE INDEX idx_wa_connections_tenant ON public.whatsapp_connections(tenant_id);

-- ============================================
-- PHASE 5: Superadmin can manage all licenses 
-- ============================================
DROP POLICY IF EXISTS "Admins can manage licenses" ON public.licenses;
CREATE POLICY "Admins and superadmins can manage licenses" ON public.licenses
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'superadmin'))
  WITH CHECK (get_my_role() IN ('admin', 'superadmin'));

-- ============================================
-- PHASE 6: Materialized views for analytics
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_conversation_stats AS
SELECT 
  tenant_id, 
  DATE(created_at) as date, 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status='resolved') as resolved,
  COUNT(*) FILTER (WHERE status='open') as open_count
FROM public.conversations 
GROUP BY tenant_id, DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_conv_stats ON public.daily_conversation_stats(tenant_id, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.pipeline_summary AS
SELECT 
  tenant_id, 
  status as stage, 
  COUNT(*) as leads_count, 
  COALESCE(SUM(valor_total), 0) as total_value
FROM public.negocios 
GROUP BY tenant_id, status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_summary ON public.pipeline_summary(tenant_id, stage);
