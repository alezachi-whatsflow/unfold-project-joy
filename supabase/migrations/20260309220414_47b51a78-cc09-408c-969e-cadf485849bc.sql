
CREATE TABLE public.whatsapp_billing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name text NOT NULL,
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_billing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access on whatsapp_billing_rules"
  ON public.whatsapp_billing_rules
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
