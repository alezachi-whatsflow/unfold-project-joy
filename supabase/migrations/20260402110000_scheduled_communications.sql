-- ============================================================
-- SCHEDULED COMMUNICATIONS: Assistente Autonomo
-- Agendamento de WhatsApp, Email e Ligacoes via IA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scheduled_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Channel & target
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'call', 'sms')),
  target_contact TEXT NOT NULL, -- phone number, email, or contact JID
  target_name TEXT,

  -- Content
  content TEXT NOT NULL, -- message body or call script
  subject TEXT, -- for email
  media_url TEXT, -- optional attachment

  -- Scheduling
  send_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INT DEFAULT 0,

  -- Source (who/what created this)
  created_by UUID, -- user ID or null (= AI)
  source TEXT DEFAULT 'assistant', -- 'assistant', 'manual', 'automation'
  playbook_session_id UUID, -- link to AI playbook session if applicable
  negocio_id UUID, -- link to CRM deal if applicable

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.scheduled_communications FOR ALL TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_sched_comms_tenant_status ON public.scheduled_communications (tenant_id, status, send_at);
CREATE INDEX idx_sched_comms_send_at ON public.scheduled_communications (send_at) WHERE status = 'pending';

GRANT ALL ON public.scheduled_communications TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_communications;
