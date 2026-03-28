-- Fix permission denied for conversation_notes
GRANT ALL ON TABLE public.conversation_notes TO authenticated;
GRANT ALL ON TABLE public.conversation_notes TO anon;

ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation on conversation_notes" ON public.conversation_notes;
CREATE POLICY "Tenant isolation on conversation_notes"
  ON public.conversation_notes FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
