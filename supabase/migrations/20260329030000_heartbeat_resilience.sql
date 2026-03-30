-- ══════════════════════════════════════════════════════════════
-- HEARTBEAT RESILIENCE — Blindagem para Zero Mensagens Perdidas
-- ══════════════════════════════════════════════════════════════

-- 1. Garantir colunas de health tracking em whatsapp_instances
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_instances' AND column_name = 'last_heartbeat_at') THEN
    ALTER TABLE public.whatsapp_instances ADD COLUMN last_heartbeat_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_instances' AND column_name = 'consecutive_failures') THEN
    ALTER TABLE public.whatsapp_instances ADD COLUMN consecutive_failures INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_instances' AND column_name = 'last_catchup_at') THEN
    ALTER TABLE public.whatsapp_instances ADD COLUMN last_catchup_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Index para heartbeat queries (buscar instâncias ativas rápido)
CREATE INDEX IF NOT EXISTS idx_instances_status_token
  ON public.whatsapp_instances(status)
  WHERE instance_token IS NOT NULL AND instance_token != '';

CREATE INDEX IF NOT EXISTS idx_instances_heartbeat
  ON public.whatsapp_instances(last_heartbeat_at)
  WHERE status = 'connected';

-- 3. Garantir UNIQUE em message_id (idempotência do catch-up)
-- Já existe como whatsapp_messages_message_id_key — verificar
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_messages_message_id_key'
  ) THEN
    ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_message_id_key UNIQUE(message_id);
  END IF;
END $$;

-- 4. Função para insert idempotente (ON CONFLICT DO NOTHING)
CREATE OR REPLACE FUNCTION public.upsert_recovered_message(
  p_instance_name TEXT,
  p_remote_jid TEXT,
  p_message_id TEXT,
  p_direction TEXT,
  p_type TEXT DEFAULT 'text',
  p_body TEXT DEFAULT NULL,
  p_media_url TEXT DEFAULT NULL,
  p_caption TEXT DEFAULT NULL,
  p_status INT DEFAULT 1,
  p_raw_payload JSONB DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT now()
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.whatsapp_messages (
    instance_name, remote_jid, message_id, direction,
    type, body, media_url, caption, status, raw_payload,
    tenant_id, created_at
  ) VALUES (
    p_instance_name, p_remote_jid, p_message_id, p_direction,
    p_type, p_body, p_media_url, p_caption, p_status, p_raw_payload,
    p_tenant_id, p_created_at
  )
  ON CONFLICT (message_id) DO NOTHING;

  RETURN FOUND;
END;
$$;

-- Grant execute to service_role (workers use service key)
GRANT EXECUTE ON FUNCTION public.upsert_recovered_message TO service_role;
