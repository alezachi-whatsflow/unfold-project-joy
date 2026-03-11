
-- =============================================
-- FASE 1: Novas tabelas para integração uazapi v2
-- =============================================

-- Adicionar colunas extras à whatsapp_instances para compatibilidade uazapi v2
ALTER TABLE whatsapp_instances
  ADD COLUMN IF NOT EXISTS instance_name TEXT,
  ADD COLUMN IF NOT EXISTS instance_token TEXT,
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS pair_code TEXT,
  ADD COLUMN IF NOT EXISTS current_presence TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS profile_name TEXT,
  ADD COLUMN IF NOT EXISTS profile_pic_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS system_name TEXT DEFAULT 'uazapiGO',
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS admin_field01 TEXT,
  ADD COLUMN IF NOT EXISTS admin_field02 TEXT,
  ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS chatbot_ignore_groups BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS chatbot_stop_keyword TEXT DEFAULT 'parar',
  ADD COLUMN IF NOT EXISTS chatbot_stop_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS chatbot_stop_when_send INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS openai_apikey TEXT,
  ADD COLUMN IF NOT EXISTS last_disconnect TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_disconnect_reason TEXT,
  ADD COLUMN IF NOT EXISTS api_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS api_updated_at TIMESTAMPTZ;

-- TABELA: whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  message_id TEXT UNIQUE,
  direction TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  body TEXT,
  media_url TEXT,
  caption TEXT,
  status INTEGER DEFAULT 1,
  track_source TEXT,
  track_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA: whatsapp_campaigns
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id TEXT UNIQUE,
  instance_name TEXT NOT NULL,
  name TEXT,
  type TEXT,
  status TEXT DEFAULT 'scheduled',
  message_type TEXT,
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  delay_min INTEGER DEFAULT 10,
  delay_max INTEGER DEFAULT 30,
  scheduled_for BIGINT,
  info TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA: whatsapp_contacts
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  jid TEXT,
  name TEXT,
  push_name TEXT,
  profile_pic_url TEXT,
  is_business BOOLEAN DEFAULT false,
  is_group BOOLEAN DEFAULT false,
  has_whatsapp BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_name, phone)
);

-- TABELA: whatsapp_leads
CREATE TABLE IF NOT EXISTS whatsapp_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  lead_name TEXT,
  lead_full_name TEXT,
  lead_status TEXT,
  is_ticket_open BOOLEAN DEFAULT false,
  assigned_attendant_id TEXT,
  kanban_order BIGINT,
  lead_tags TEXT[],
  chatbot_disable_until BIGINT,
  lead_field01 TEXT,
  lead_field02 TEXT,
  lead_field03 TEXT,
  lead_field04 TEXT,
  lead_field05 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_name, chat_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_wamsg_instance ON whatsapp_messages(instance_name);
CREATE INDEX IF NOT EXISTS idx_wamsg_jid ON whatsapp_messages(remote_jid);
CREATE INDEX IF NOT EXISTS idx_wamsg_created ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wacamp_instance ON whatsapp_campaigns(instance_name);
CREATE INDEX IF NOT EXISTS idx_waleads_instance ON whatsapp_leads(instance_name);

-- RLS para novas tabelas
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;

-- Policies abertas (mesmo padrão do projeto)
CREATE POLICY "Allow public access on whatsapp_messages" ON whatsapp_messages FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on whatsapp_campaigns" ON whatsapp_campaigns FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on whatsapp_contacts" ON whatsapp_contacts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on whatsapp_leads" ON whatsapp_leads FOR ALL TO public USING (true) WITH CHECK (true);

-- Ativar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
