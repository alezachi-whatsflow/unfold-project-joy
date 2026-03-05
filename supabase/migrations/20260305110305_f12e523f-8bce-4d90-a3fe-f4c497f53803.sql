ALTER TABLE public.dunning_rules ADD COLUMN IF NOT EXISTS checkout_source_id uuid REFERENCES public.checkout_sources(id);
ALTER TABLE public.dunning_rules ADD COLUMN IF NOT EXISTS template_key text;