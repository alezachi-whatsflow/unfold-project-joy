
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone_billing text DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone_lead text DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone_company text DEFAULT '';
