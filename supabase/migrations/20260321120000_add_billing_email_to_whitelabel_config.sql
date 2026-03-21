ALTER TABLE public.whitelabel_config
  ADD COLUMN IF NOT EXISTS billing_email TEXT;
