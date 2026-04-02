-- ============================================================
-- TICKET SYSTEM: Suporte / Helpdesk / Comunicação Interna
-- Replaces empty "conversations" page with full ticketing
-- ============================================================

-- 1. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_client', 'waiting_internal', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'support', 'billing', 'technical', 'commercial', 'onboarding')),

  -- Assignment
  assigned_to UUID, -- profiles.id of the agent
  department_id UUID, -- departments.id

  -- Polymorphic reference (link to CRM deal, WhatsApp contact, etc.)
  reference_type TEXT, -- 'negocio', 'whatsapp_contact', 'customer', null
  reference_id TEXT, -- the ID of the referenced entity

  -- WhatsApp link (optional — for tickets created from inbox)
  whatsapp_jid TEXT, -- remote_jid of the WhatsApp conversation
  whatsapp_instance TEXT, -- instance_name for sending replies

  -- SLA
  sla_deadline TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_by UUID, -- who opened the ticket
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.tickets FOR ALL TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_tickets_tenant_status ON public.tickets (tenant_id, status);
CREATE INDEX idx_tickets_assigned ON public.tickets (assigned_to);
CREATE INDEX idx_tickets_reference ON public.tickets (reference_type, reference_id);

GRANT ALL ON public.tickets TO authenticated;

-- 2. TICKET MESSAGES TABLE (dual chat: internal + external)
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  sender_id UUID, -- profiles.id (null = system message)
  sender_name TEXT, -- cached name for display

  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'document', 'audio', 'system')),
  media_url TEXT,

  -- CRUCIAL: separates internal team chat from client-facing messages
  is_internal BOOLEAN NOT NULL DEFAULT false,

  -- If this message was sent to WhatsApp, store the wa message ID
  wa_message_id TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.ticket_messages FOR ALL TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages (ticket_id, created_at);
CREATE INDEX idx_ticket_messages_tenant ON public.ticket_messages (tenant_id);

-- Realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;

GRANT ALL ON public.ticket_messages TO authenticated;

-- 3. Trigger to auto-update tickets.updated_at
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tickets SET updated_at = now() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_ticket_message_update_ticket
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION update_ticket_timestamp();
