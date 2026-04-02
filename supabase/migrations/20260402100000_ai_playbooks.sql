-- ============================================================
-- AI PLAYBOOKS: Central de Funcionários Autônomos
-- Agents that conduct conversations, extract CRM data,
-- and escalate to humans when needed.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- AI Configuration
  objective_prompt TEXT NOT NULL, -- System prompt for the AI agent
  persona TEXT DEFAULT 'assistente', -- How the AI introduces itself
  tone TEXT DEFAULT 'profissional' CHECK (tone IN ('profissional', 'casual', 'tecnico', 'amigavel')),

  -- Fields to extract from conversation → maps to negocios.custom_fields
  fields_to_extract JSONB NOT NULL DEFAULT '[]',
  -- Format: [{ "key": "budget", "label": "Orçamento", "type": "currency", "required": true, "question_hint": "Qual seu orçamento disponível?" }]

  -- Trigger conditions (when to activate this playbook)
  trigger_conditions JSONB DEFAULT '{}',
  -- Format: { "pipeline_stage": "prospeccao", "tags_include": ["novo"], "channel": "whatsapp", "auto_start": true }

  -- Escalation rules
  escalation_keywords TEXT[] DEFAULT ARRAY['reclamação', 'cancelar', 'falar com humano', 'gerente'],
  escalation_after_minutes INT DEFAULT 30, -- auto-escalate if no progress
  max_messages INT DEFAULT 20, -- max AI messages before forced escalation

  -- Status & limits
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_native BOOLEAN DEFAULT false, -- true for the 4 default playbooks
  category TEXT DEFAULT 'custom' CHECK (category IN ('qualification', 'diagnostic', 'followup', 'post_sale', 'custom')),

  -- Analytics
  total_sessions INT DEFAULT 0,
  completed_sessions INT DEFAULT 0,
  avg_completion_rate DECIMAL(5,2) DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.ai_playbooks FOR ALL TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_ai_playbooks_tenant ON public.ai_playbooks (tenant_id, is_active);

GRANT ALL ON public.ai_playbooks TO authenticated;

-- Limit: max 20 playbooks per tenant
CREATE OR REPLACE FUNCTION check_playbook_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.ai_playbooks WHERE tenant_id = NEW.tenant_id) >= 20 THEN
    RAISE EXCEPTION 'Limite de 20 playbooks por tenant atingido.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_playbook_limit
  BEFORE INSERT ON public.ai_playbooks
  FOR EACH ROW EXECUTE FUNCTION check_playbook_limit();

-- Playbook sessions (track each AI conversation)
CREATE TABLE IF NOT EXISTS public.ai_playbook_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  playbook_id UUID NOT NULL REFERENCES public.ai_playbooks(id) ON DELETE CASCADE,
  contact_jid TEXT, -- WhatsApp JID
  contact_name TEXT,
  negocio_id UUID, -- linked CRM deal
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'escalated', 'expired', 'cancelled')),
  extracted_data JSONB DEFAULT '{}', -- collected fields so far
  messages_count INT DEFAULT 0,
  escalation_reason TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_playbook_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.ai_playbook_sessions FOR ALL TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_playbook_sessions_tenant ON public.ai_playbook_sessions (tenant_id, status);
CREATE INDEX idx_playbook_sessions_playbook ON public.ai_playbook_sessions (playbook_id);
CREATE INDEX idx_playbook_sessions_contact ON public.ai_playbook_sessions (contact_jid);

GRANT ALL ON public.ai_playbook_sessions TO authenticated;

-- Realtime for live session updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_playbook_sessions;
