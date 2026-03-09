
CREATE TABLE public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  conversa_id text NOT NULL,
  direcao text NOT NULL DEFAULT 'recebido',
  tipo text NOT NULL DEFAULT 'text',
  conteudo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  lead_id uuid,
  origem text NOT NULL DEFAULT 'suporte',
  timestamp timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access on message_logs"
  ON public.message_logs FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_logs;
