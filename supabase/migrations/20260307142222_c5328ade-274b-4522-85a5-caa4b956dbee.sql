
ALTER TABLE public.asaas_expenses
  ADD COLUMN IF NOT EXISTS supplier text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cost_center text DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS installments text DEFAULT 'À vista',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_account text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_scheduled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
