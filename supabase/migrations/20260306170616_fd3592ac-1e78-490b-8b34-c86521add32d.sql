
CREATE TABLE public.digital_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_name text NOT NULL,
  category text,
  overall_score numeric NOT NULL DEFAULT 0,
  overall_label text,
  score_website numeric,
  score_instagram numeric,
  score_google_business numeric,
  score_meta numeric,
  score_whatsapp numeric,
  score_neuro numeric,
  details_json jsonb DEFAULT '{}'::jsonb,
  address text,
  phone text,
  website_url text,
  total_reviews integer,
  avg_rating numeric
);

ALTER TABLE public.digital_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on digital_analyses" ON public.digital_analyses FOR SELECT USING (true);
CREATE POLICY "Allow public insert on digital_analyses" ON public.digital_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on digital_analyses" ON public.digital_analyses FOR DELETE USING (true);

CREATE TABLE public.export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES public.digital_analyses(id) ON DELETE CASCADE NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on export_logs" ON public.export_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on export_logs" ON public.export_logs FOR INSERT WITH CHECK (true);
