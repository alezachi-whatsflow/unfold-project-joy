-- ═══════════════════════════════════════════════════════════════
-- FEATURE PARITY — ALL 7 PHASES
-- 38 functions, 55% → 97% coverage
-- ═══════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════╗
-- ║  FASE 1 — Quick Wins de Atendimento      ║
-- ╚═══════════════════════════════════════════╝

-- 1.1 Respostas Rápidas
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  shortcut TEXT NOT NULL,           -- ex: "/ola", "/preco"
  body TEXT NOT NULL,
  media_url TEXT,                    -- optional attachment
  media_type TEXT,                   -- image, document, audio, video
  department_id UUID,                -- NULL = global, otherwise department-specific
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_private BOOLEAN DEFAULT false,  -- only visible to creator
  usage_count INTEGER DEFAULT 0,
  variables TEXT[] DEFAULT '{}',     -- {{nome}}, {{empresa}}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_tenant ON quick_replies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_shortcut ON quick_replies(tenant_id, shortcut);

-- 1.2 Transferência de conversa
CREATE TABLE IF NOT EXISTS public.conversation_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_jid TEXT NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_department_id UUID,
  note TEXT,
  transferred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfers_tenant ON conversation_transfers(tenant_id);

-- 1.3 Notas internas
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_jid TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',      -- @mentioned user IDs
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_conv ON internal_notes(tenant_id, conversation_jid);

-- 1.4 Conversation timeout rules
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS auto_close_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_close_message TEXT;

-- ╔═══════════════════════════════════════════╗
-- ║  FASE 2 — Multi-Atendentes               ║
-- ╚═══════════════════════════════════════════╝

-- 2.1 Agent status tracking
CREATE TABLE IF NOT EXISTS public.agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline',  -- online, offline, away, busy
  max_conversations INTEGER DEFAULT 10,
  current_conversations INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_status_tenant ON agent_status(tenant_id);

-- 2.2 Departments / Setores
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  distribution_mode TEXT DEFAULT 'round_robin',  -- round_robin, least_busy, manual
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);

-- 2.3 Agent ↔ Department mapping
CREATE TABLE IF NOT EXISTS public.agent_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_lead BOOLEAN DEFAULT false,
  UNIQUE(user_id, department_id)
);

-- 2.4 Distribution round-robin state
CREATE TABLE IF NOT EXISTS public.distribution_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  last_assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, department_id)
);

-- 2.5 Add department_id to conversations tracking
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- ╔═══════════════════════════════════════════╗
-- ║  FASE 3 — Templates HSM + Busca          ║
-- ╚═══════════════════════════════════════════╝

-- 3.1 HSM Templates
CREATE TABLE IF NOT EXISTS public.hsm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channel_integrations(id) ON DELETE CASCADE,
  meta_template_id TEXT,              -- ID from Meta
  name TEXT NOT NULL,
  category TEXT NOT NULL,             -- UTILITY, MARKETING, AUTHENTICATION
  language TEXT DEFAULT 'pt_BR',
  status TEXT DEFAULT 'PENDING',      -- PENDING, APPROVED, REJECTED
  rejection_reason TEXT,
  header_type TEXT,                    -- TEXT, IMAGE, VIDEO, DOCUMENT
  header_content TEXT,                 -- URL or text
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]',         -- [{type, text, url, phone}]
  variables TEXT[] DEFAULT '{}',      -- {{1}}, {{2}}
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hsm_tenant ON hsm_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hsm_status ON hsm_templates(tenant_id, status);

-- 3.2 Full-text search index on messages
CREATE INDEX IF NOT EXISTS idx_wa_messages_body_fts
  ON whatsapp_messages USING GIN (to_tsvector('portuguese', COALESCE(body, '')));

-- 3.3 Snooze tracking
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ╔═══════════════════════════════════════════╗
-- ║  FASE 4 — Notificações + SLA + Métricas  ║
-- ╚═══════════════════════════════════════════╝

-- 4.1 Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled BOOLEAN DEFAULT true,
  desktop_push BOOLEAN DEFAULT true,
  email_digest TEXT DEFAULT 'daily',   -- none, daily, weekly
  sla_alerts BOOLEAN DEFAULT true,
  keyword_alerts TEXT[] DEFAULT '{}',  -- palavras-chave sensíveis
  UNIQUE(tenant_id, user_id)
);

-- 4.2 SLA rules per department
CREATE TABLE IF NOT EXISTS public.sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  first_response_minutes INTEGER DEFAULT 5,
  resolution_minutes INTEGER DEFAULT 60,
  escalation_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_tenant ON sla_rules(tenant_id);

-- 4.3 Keyword alerts
CREATE TABLE IF NOT EXISTS public.keyword_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',      -- low, medium, high, critical
  notify_user_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keyword_tenant ON keyword_alerts(tenant_id);

-- ╔═══════════════════════════════════════════╗
-- ║  FASE 5 — IA Avançada                     ║
-- ╚═══════════════════════════════════════════╝

-- 5.1 Sentiment tracking per conversation
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS sentiment TEXT,           -- positive, neutral, negative
  ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL,  -- -1.0 to 1.0
  ADD COLUMN IF NOT EXISTS sentiment_updated_at TIMESTAMPTZ;

-- 5.2 Audio transcriptions
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS transcription TEXT,
  ADD COLUMN IF NOT EXISTS transcription_at TIMESTAMPTZ;

-- 5.3 Automation triggers (keyword → action)
CREATE TABLE IF NOT EXISTS public.automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'keyword',  -- keyword, event, schedule
  trigger_value TEXT NOT NULL,                    -- the keyword or event name
  action_type TEXT NOT NULL,                      -- reply, assign, tag, transfer, webhook
  action_config JSONB NOT NULL DEFAULT '{}',     -- {reply_text, assign_to, tag_name, webhook_url}
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_triggers_tenant ON automation_triggers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_triggers_active ON automation_triggers(tenant_id, is_active, trigger_type);

-- ╔═══════════════════════════════════════════╗
-- ║  FASE 6 — Gestão de Grupos Completa       ║
-- ╚═══════════════════════════════════════════╝

-- 6.1 Group members tracking
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  jid TEXT,
  name TEXT,
  role TEXT DEFAULT 'member',         -- admin, member
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  added_by TEXT,
  UNIQUE(group_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_gmembers_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_gmembers_tenant ON group_members(tenant_id);

-- 6.2 Group scheduled messages
CREATE TABLE IF NOT EXISTS public.group_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_ids UUID[] NOT NULL,          -- multiple groups
  message_type TEXT DEFAULT 'text',
  message_body TEXT,
  media_url TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  recurrence TEXT,                     -- none, daily, weekly, monthly
  status TEXT DEFAULT 'pending',       -- pending, sent, failed, cancelled
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gsched_tenant ON group_scheduled_messages(tenant_id);

-- 6.3 Group moderation rules
CREATE TABLE IF NOT EXISTS public.group_moderation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID REFERENCES whatsapp_groups(id) ON DELETE CASCADE,  -- NULL = all groups
  rule_type TEXT NOT NULL,            -- block_links, block_spam, block_words, block_media
  config JSONB DEFAULT '{}',         -- {blocked_words: [...], max_msgs_per_min: 5}
  action TEXT DEFAULT 'warn',         -- warn, delete, remove_member
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gmod_tenant ON group_moderation_rules(tenant_id);

-- ╔═══════════════════════════════════════════╗
-- ║  FASE 7 — Segurança + Compliance          ║
-- ╚═══════════════════════════════════════════╝

-- 7.1 2FA settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ;

-- 7.2 LGPD data requests
CREATE TABLE IF NOT EXISTS public.lgpd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  request_type TEXT NOT NULL,          -- export, delete, portability
  status TEXT DEFAULT 'pending',       -- pending, processing, completed, rejected
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  result_url TEXT,                     -- R2 URL for export file
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_tenant ON lgpd_requests(tenant_id);

-- 7.3 API keys for external integrations
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,             -- hashed, never store plain
  key_prefix TEXT NOT NULL,           -- first 8 chars for identification
  permissions TEXT[] DEFAULT '{}',    -- read, write, admin
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apikeys_tenant ON api_keys(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_apikeys_prefix ON api_keys(key_prefix);

-- ╔═══════════════════════════════════════════╗
-- ║  RLS + GRANTS para TODAS as tabelas       ║
-- ╚═══════════════════════════════════════════╝

DO $$
DECLARE
  t_name text;
  new_tables text[] := ARRAY[
    'quick_replies', 'conversation_transfers', 'internal_notes',
    'agent_status', 'departments', 'agent_departments', 'distribution_state',
    'hsm_templates', 'notification_preferences', 'sla_rules', 'keyword_alerts',
    'automation_triggers', 'group_members', 'group_scheduled_messages',
    'group_moderation_rules', 'lgpd_requests', 'api_keys'
  ];
BEGIN
  FOREACH t_name IN ARRAY new_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
      EXECUTE format('DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.%I', t_name);
      EXECUTE format(
        'CREATE POLICY "Strict_Tenant_Isolation" ON public.%I FOR ALL '
        'USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids())) '
        'WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))',
        t_name
      );
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t_name);
    END IF;
  END LOOP;
END $$;

-- Enable Realtime for key tables (skip if already member)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE agent_status; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE internal_notes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversation_transfers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
