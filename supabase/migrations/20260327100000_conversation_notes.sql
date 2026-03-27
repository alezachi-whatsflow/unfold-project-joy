-- Internal notes per conversation (chat_id)
CREATE TABLE IF NOT EXISTS public.conversation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_notes_chat ON conversation_notes(chat_id);
CREATE INDEX IF NOT EXISTS idx_conversation_notes_tenant ON conversation_notes(tenant_id);
ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_notes' AND policyname = 'Tenant isolation on conversation_notes') THEN
    CREATE POLICY "Tenant isolation on conversation_notes"
      ON public.conversation_notes FOR ALL TO authenticated
      USING (tenant_id IN (SELECT get_my_tenant_ids()))
      WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
  END IF;
END $$;
