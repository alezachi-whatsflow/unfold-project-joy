
-- Table to store multiple pipeline configurations
CREATE TABLE public.sales_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  currency_prefix TEXT NOT NULL DEFAULT 'R$',
  show_probability BOOLEAN NOT NULL DEFAULT true,
  show_forecast BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pipelines" ON public.sales_pipelines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert pipelines" ON public.sales_pipelines
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update pipelines" ON public.sales_pipelines
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete pipelines" ON public.sales_pipelines
  FOR DELETE TO authenticated USING (true);

-- Add pipeline_id to negocios
ALTER TABLE public.negocios ADD COLUMN pipeline_id UUID REFERENCES public.sales_pipelines(id) ON DELETE SET NULL;

-- Insert a default pipeline
INSERT INTO public.sales_pipelines (name, description, is_default, stages, ordem)
VALUES (
  'Pipeline Principal',
  'Pipeline padrão de vendas',
  true,
  '[
    {"key":"prospeccao","label":"Prospecção","color":"#60a5fa","enabled":true,"ordem":1},
    {"key":"qualificado","label":"Qualificado","color":"#a78bfa","enabled":true,"ordem":2},
    {"key":"proposta","label":"Proposta Enviada","color":"#f59e0b","enabled":true,"ordem":3},
    {"key":"negociacao","label":"Em Negociação","color":"#fb923c","enabled":true,"ordem":4},
    {"key":"fechado_ganho","label":"Fechado — Ganho","color":"#4ade80","enabled":true,"ordem":5},
    {"key":"fechado_perdido","label":"Fechado — Perdido","color":"#f87171","enabled":true,"ordem":6}
  ]'::jsonb,
  1
);

-- Assign existing negocios to the default pipeline
UPDATE public.negocios SET pipeline_id = (SELECT id FROM public.sales_pipelines WHERE is_default = true LIMIT 1);
