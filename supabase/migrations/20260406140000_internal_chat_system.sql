-- ============================================================================
-- Internal Chat System — Slack/Teams-style P2P + Group chat for team
-- Tables: internal_chats, internal_chat_members, internal_chat_messages
-- ============================================================================

-- 1. Chats (conversations)
CREATE TABLE IF NOT EXISTS public.internal_chats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  name          TEXT,                                     -- NULL for P2P, name for groups
  type          TEXT NOT NULL DEFAULT 'direct',           -- 'direct' | 'group' | 'ticket_thread'
  reference_id  TEXT,                                     -- ticket_id or other entity
  created_by    UUID,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_internal_chats_tenant ON public.internal_chats(tenant_id);
CREATE INDEX idx_internal_chats_ref ON public.internal_chats(type, reference_id);

ALTER TABLE public.internal_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal_chats_tenant_isolation" ON public.internal_chats
  FOR ALL TO authenticated
  USING (
    public.is_nexus_user()
    OR tenant_id IN (SELECT public.get_authorized_tenant_ids())
  )
  WITH CHECK (
    public.is_nexus_user()
    OR tenant_id IN (SELECT public.get_authorized_tenant_ids())
  );

-- 2. Chat members
CREATE TABLE IF NOT EXISTS public.internal_chat_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    UUID NOT NULL REFERENCES public.internal_chats(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  tenant_id  UUID NOT NULL,
  role       TEXT DEFAULT 'member',                       -- 'admin' | 'member'
  muted      BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_chat_members_unique ON public.internal_chat_members(chat_id, user_id);
CREATE INDEX idx_chat_members_user ON public.internal_chat_members(user_id, tenant_id);

ALTER TABLE public.internal_chat_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_members_tenant_isolation" ON public.internal_chat_members
  FOR ALL TO authenticated
  USING (
    public.is_nexus_user()
    OR tenant_id IN (SELECT public.get_authorized_tenant_ids())
  )
  WITH CHECK (
    public.is_nexus_user()
    OR tenant_id IN (SELECT public.get_authorized_tenant_ids())
  );

-- 3. Chat messages
CREATE TABLE IF NOT EXISTS public.internal_chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id      UUID NOT NULL REFERENCES public.internal_chats(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  sender_id    UUID,
  sender_name  TEXT,
  content      TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',                       -- 'text' | 'image' | 'system' | 'mention_alert'
  media_url    TEXT,
  metadata     JSONB DEFAULT '{}',                        -- for mention_alert: { ticket_id, ticket_title, mentioned_by }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_chat ON public.internal_chat_messages(chat_id, created_at);
CREATE INDEX idx_chat_messages_tenant ON public.internal_chat_messages(tenant_id);

ALTER TABLE public.internal_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_tenant_isolation" ON public.internal_chat_messages
  FOR ALL TO authenticated
  USING (
    public.is_nexus_user()
    OR tenant_id IN (SELECT public.get_authorized_tenant_ids())
  )
  WITH CHECK (
    public.is_nexus_user()
    OR tenant_id IN (SELECT public.get_authorized_tenant_ids())
  );

-- 4. Notifications table (lightweight, for @mentions and ticket alerts)
CREATE TABLE IF NOT EXISTS public.internal_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  user_id     UUID NOT NULL,                              -- recipient
  type        TEXT NOT NULL DEFAULT 'mention',             -- 'mention' | 'ticket_assign' | 'ticket_reply'
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,                                        -- e.g. "/app/slug/suporte?ticket=UUID"
  read        BOOLEAN DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.internal_notifications(user_id, read, created_at DESC);

ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_only" ON public.internal_notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_nexus_user())
  WITH CHECK (public.is_nexus_user() OR tenant_id IN (SELECT public.get_authorized_tenant_ids()));

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_notifications;

-- 6. Trigger: update chat.updated_at on new message
CREATE OR REPLACE FUNCTION public.trg_chat_message_update_chat()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.internal_chats SET updated_at = now() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_internal_chat_msg_update
  AFTER INSERT ON public.internal_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_chat_message_update_chat();

-- 7. Helper: find or create direct chat between two users
CREATE OR REPLACE FUNCTION public.find_or_create_direct_chat(
  p_tenant_id UUID,
  p_user_a UUID,
  p_user_b UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id UUID;
BEGIN
  -- Find existing direct chat between these two users
  SELECT cm1.chat_id INTO v_chat_id
  FROM public.internal_chat_members cm1
  JOIN public.internal_chat_members cm2 ON cm1.chat_id = cm2.chat_id
  JOIN public.internal_chats c ON c.id = cm1.chat_id
  WHERE cm1.user_id = p_user_a
    AND cm2.user_id = p_user_b
    AND c.type = 'direct'
    AND c.tenant_id = p_tenant_id
  LIMIT 1;

  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;
  END IF;

  -- Create new direct chat
  INSERT INTO public.internal_chats (tenant_id, type, created_by)
  VALUES (p_tenant_id, 'direct', p_user_a)
  RETURNING id INTO v_chat_id;

  -- Add both members
  INSERT INTO public.internal_chat_members (chat_id, user_id, tenant_id)
  VALUES (v_chat_id, p_user_a, p_tenant_id),
         (v_chat_id, p_user_b, p_tenant_id);

  RETURN v_chat_id;
END;
$$;
