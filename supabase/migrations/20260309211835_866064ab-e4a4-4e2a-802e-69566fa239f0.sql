
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  label text NOT NULL,
  numero text,
  provedor text NOT NULL DEFAULT 'zapi',
  instance_id_api text NOT NULL DEFAULT '',
  token_api text NOT NULL DEFAULT '',
  server_url text,
  uso_principal text NOT NULL DEFAULT 'suporte',
  status text NOT NULL DEFAULT 'disconnected',
  webhook_url text NOT NULL DEFAULT '',
  ultimo_ping timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access on whatsapp_instances" ON public.whatsapp_instances
  FOR ALL TO public USING (true) WITH CHECK (true);
