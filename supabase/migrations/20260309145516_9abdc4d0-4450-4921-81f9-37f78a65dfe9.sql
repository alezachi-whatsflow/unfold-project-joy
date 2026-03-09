CREATE TABLE public.prospect_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche text NOT NULL,
  city text NOT NULL,
  leads_found integer NOT NULL DEFAULT 0,
  leads_analyzed integer NOT NULL DEFAULT 0,
  hot_leads integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE public.prospect_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access on prospect_campaigns" ON public.prospect_campaigns
  FOR ALL TO public USING (true) WITH CHECK (true);