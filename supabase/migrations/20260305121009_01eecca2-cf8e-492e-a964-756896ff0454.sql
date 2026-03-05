
-- Web Scraps table
CREATE TABLE IF NOT EXISTS public.web_scraps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text,
  description text,
  keywords text[],
  technologies text[],
  value_proposition text,
  niche text,
  contact_email text,
  contact_phone text,
  raw_markdown text,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.web_scraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on web_scraps" ON public.web_scraps FOR SELECT USING (true);
CREATE POLICY "Allow public insert on web_scraps" ON public.web_scraps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on web_scraps" ON public.web_scraps FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on web_scraps" ON public.web_scraps FOR DELETE USING (true);

-- Profiles Analysis table
CREATE TABLE IF NOT EXISTS public.profiles_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'instagram',
  username text NOT NULL,
  display_name text,
  bio text,
  followers integer,
  following integer,
  posts_count integer,
  avg_engagement_rate numeric,
  profile_url text NOT NULL,
  profile_image_url text,
  content_strategy_notes text,
  authority_score numeric,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.profiles_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on profiles_analysis" ON public.profiles_analysis FOR SELECT USING (true);
CREATE POLICY "Allow public insert on profiles_analysis" ON public.profiles_analysis FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on profiles_analysis" ON public.profiles_analysis FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on profiles_analysis" ON public.profiles_analysis FOR DELETE USING (true);

-- Business Leads table
CREATE TABLE IF NOT EXISTS public.business_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  website text,
  rating numeric,
  reviews_count integer,
  category text,
  latitude numeric,
  longitude numeric,
  place_id text,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on business_leads" ON public.business_leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert on business_leads" ON public.business_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on business_leads" ON public.business_leads FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on business_leads" ON public.business_leads FOR DELETE USING (true);
